import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      throw new Error(`OpenBanking 응답 파싱 실패: ${raw.substring(0, 200)}`);
    }
  }
}

async function getOpenBankingConfigs(supabase: any) {
  // 슈퍼어드민 global config에서 OpenBanking 설정을 읽습니다.
  const { data: configs, error } = await supabase
    .from("system_configs")
    .select("key, value")
    .in("key", ["OPENBANK_CLIENT_ID", "OPENBANK_CLIENT_SECRET", "OPENBANK_BASE_URL"]);

  if (error) throw new Error(`설정 조회 실패: ${error.message}`);

  const configMap: Record<string, string> = {};
  (configs || []).forEach((c: any) => { configMap[c.key] = c.value; });

  const clientId = configMap["OPENBANK_CLIENT_ID"];
  const clientSecret = configMap["OPENBANK_CLIENT_SECRET"];
  const baseUrl = configMap["OPENBANK_BASE_URL"] || "https://openapi.openbanking.or.kr";

  if (!clientId || !clientSecret) {
    throw new Error("OPENBANK API 설정 (OPENBANK_CLIENT_ID, OPENBANK_CLIENT_SECRET)이 누락되었습니다. 슈퍼어드민 API 관리에서 저장하세요.");
  }

  return { clientId, clientSecret, baseUrl };
}

async function getAccessToken(baseUrl: string, clientId: string, clientSecret: string) {
  const tokenUrl = `${baseUrl}/oauth/2.0/token`;
  const data = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: data.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`토큰 발급 실패 [${response.status}]: ${text}`);
  }

  const json = await response.json();
  if (!json.access_token) throw new Error("access_token이 응답에 없습니다.");
  return json.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, tenantId } = body;

    if (!tenantId) throw new Error("tenantId가 필요합니다.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const configs = await getOpenBankingConfigs(supabase);
    const token = await getAccessToken(configs.baseUrl, configs.clientId, configs.clientSecret);

    let result: any;

    if (action === "transaction_list") {
      const { fintechUseNum, fromDate, toDate, sortOrder = "D" } = body;
      if (!fintechUseNum) throw new Error("fintechUseNum가 필요합니다.");
      if (!fromDate || !toDate) throw new Error("조회 기간(fromDate, toDate)이 필요합니다.");

      const now = new Date();
      const tran_dtime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
      const bank_tran_id = `M${tran_dtime}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

      const params = {
        bank_tran_id,
        fintech_use_num: fintechUseNum,
        inquiry_type: "A",
        inquiry_base: "D",
        from_date: fromDate,
        to_date: toDate,
        sort_order: sortOrder,
        tran_dtime,
      };

      const endpoint = `${configs.baseUrl}/v2.0/account/transaction_list/fin_num`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(params),
      });

      result = await parseSafeJSON(response);

    } else if (action === "account_list") {
      const { userSeqNo } = body;
      if (!userSeqNo) throw new Error("userSeqNo가 필요합니다.");

      const endpoint = `${configs.baseUrl}/v2.0/account/list?user_seq_no=${encodeURIComponent(userSeqNo)}`;
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
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
    console.error("openbanking-api 오류:", error);
    return new Response(
      JSON.stringify({ error: error.message, result: { code: "ERROR", message: error.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
