import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOKEN_URL = "https://oauth.codef.io/oauth/token";
const BASE_URL = "https://development.codef.io";
const CREATE_ACCOUNT_URL = `${BASE_URL}/v1/account/create`;

function encryptRsa(plainText: string, publicKeyPem: string): string {
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
  const encrypted = publicKey.encrypt(plainText, "RSAES-PKCS1-V1_5");
  return forge.util.encode64(encrypted);
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const authStr = `${clientId}:${clientSecret}`;
  const b64Auth = btoa(authStr);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${b64Auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=read",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`토큰 발급 실패 [${response.status}]: ${text}`);
  }

  const data = await response.json();
  if (!data.access_token) throw new Error("access_token이 응답에 없습니다.");
  return data.access_token;
}

async function parseSafeJSON(response: Response) {
  const raw = await response.text();
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch (_) {}
  try {
    return JSON.parse(decoded);
  } catch (_) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      throw new Error(`CODEF 응답 파싱 실패: ${raw.substring(0, 200)}`);
    }
  }
}

async function getCodefConfigs(supabase: any, tenantId: string) {
  const { data: configs, error } = await supabase
    .from("tenant_api_configs")
    .select("config_key, config_value")
    .eq("tenant_id", tenantId)
    .in("config_key", ["CODEF_CLIENT_ID", "CODEF_CLIENT_SECRET", "CODEF_PUBLIC_KEY"]);

  if (error) throw new Error(`설정 조회 실패: ${error.message}`);

  const configMap: Record<string, string> = {};
  (configs || []).forEach((c: any) => { configMap[c.config_key] = c.config_value; });

  const clientId = configMap["CODEF_CLIENT_ID"];
  const clientSecret = configMap["CODEF_CLIENT_SECRET"];
  const publicKey = configMap["CODEF_PUBLIC_KEY"];

  if (!clientId || !clientSecret) {
    throw new Error("CODEF API 설정(CLIENT_ID, CLIENT_SECRET)이 누락되었습니다.");
  }

  return { clientId, clientSecret, publicKey };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, tenantId } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const configs = await getCodefConfigs(supabase, tenantId);
    const token = await getAccessToken(configs.clientId, configs.clientSecret);

    let result: any;

    if (action === "create_connected_id") {
      // ─── 기존: Connected ID 생성 ───
      const { businessType, organization, derFile, keyFile, password, loginId } = body;

      if (!configs.publicKey) throw new Error("CODEF PUBLIC_KEY가 누락되었습니다.");
      const encryptedPw = encryptRsa(password, configs.publicKey);

      let accountEntry: Record<string, any>;
      if (businessType === "BK") {
        if (!derFile || !keyFile) throw new Error("은행 연동에는 인증서 파일(der, key)이 필요합니다.");
        accountEntry = {
          countryCode: "KR", businessType: "BK", clientType: "B",
          organization, loginType: "0", certType: "1",
          derFile, keyFile, password: encryptedPw,
        };
      } else {
        if (!loginId) throw new Error("카드 연동에는 로그인 ID가 필요합니다.");
        accountEntry = {
          countryCode: "KR", businessType: "CD", clientType: "B",
          organization, loginType: "1", id: loginId, password: encryptedPw,
        };
      }

      console.log(`CODEF 계정 등록 요청: ${businessType} / ${organization}`);
      const response = await fetch(CREATE_ACCOUNT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ accountList: [accountEntry] }),
      });

      result = await parseSafeJSON(response);

      // 성공 시 connectedId 저장
      if (result?.result?.code === "CF-00000" && result?.data?.connectedId) {
        const connectedId = result.data.connectedId;
        const orgName = businessType === "BK"
          ? `CONNECTED_ID_BK_${organization}`
          : `CONNECTED_ID_CD_${organization}`;

        await supabase.from("tenant_api_configs").upsert(
          { tenant_id: tenantId, config_key: orgName, config_value: connectedId, category: "finance_connected" },
          { onConflict: "tenant_id,config_key" }
        );
      }

    } else if (action === "transaction_list") {
      // ─── 신규: 은행 거래내역 조회 ───
      const { connectedId, organization, account, startDate, endDate, orderBy } = body;

      if (!connectedId) throw new Error("connectedId가 필요합니다.");

      const parameter: Record<string, any> = {
        organization,
        connectedId,
        startDate: startDate || "",
        endDate: endDate || "",
        orderBy: orderBy || "0",
      };
      if (account) parameter.account = account;

      const endpoint = "/v1/kr/bank/b/account/transaction-list";
      console.log(`거래내역 조회: ${organization} / ${account || "전체"}`);

      const response = await fetch(BASE_URL + endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parameter),
      });

      result = await parseSafeJSON(response);

    } else if (action === "card_approval_list") {
      // ─── 카드 승인내역 조회 (approval-list) ───
      const { connectedId, organization, startDate, endDate, orderBy, cardNo, inquiryType, memberStoreInfoType } = body;

      if (!connectedId) throw new Error("connectedId가 필요합니다.");

      const parameter: Record<string, any> = {
        organization,
        connectedId,
        startDate: startDate || "",
        endDate: endDate || "",
        orderBy: orderBy || "0",
        inquiryType: inquiryType || "1",
        memberStoreInfoType: memberStoreInfoType || "3",
      };
      if (cardNo) parameter.cardNo = cardNo;

      const endpoint = "/v1/kr/card/b/account/approval-list";
      console.log(`카드 승인내역 조회: ${organization} / ${cardNo || "전체"}`);

      const response = await fetch(BASE_URL + endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parameter),
      });

      result = await parseSafeJSON(response);

    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("codef-api 오류:", error);
    return new Response(
      JSON.stringify({ error: error.message, result: { code: "ERROR", message: error.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
