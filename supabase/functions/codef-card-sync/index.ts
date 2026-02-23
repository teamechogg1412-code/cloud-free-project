import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOKEN_URL = "https://oauth.codef.io/oauth/token";
const BASE_URL = "https://development.codef.io";

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
      throw new Error(`CODEF 응답 파싱 실패: ${raw.substring(0, 300)}`);
    }
  }
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const b64Auth = btoa(`${clientId}:${clientSecret}`);
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { clientId, clientSecret, connectedId, organization, startDate, endDate, orderBy, inquiryType, memberStoreInfoType } = body;

    if (!clientId || !clientSecret) throw new Error("CODEF 인증 정보가 필요합니다.");
    if (!connectedId) throw new Error("connectedId가 필요합니다.");

    const token = await getAccessToken(clientId, clientSecret);

    const parameter: Record<string, any> = {
      organization: organization || "0301",
      connectedId,
      startDate: startDate || "",
      endDate: endDate || "",
      orderBy: orderBy || "0",
      inquiryType: inquiryType || "1",
      memberStoreInfoType: memberStoreInfoType || "3",
    };

    const endpoint = "/v1/kr/card/b/account/approval-list";
    console.log(`카드 승인내역 조회: ${organization}`);

    const response = await fetch(BASE_URL + endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parameter),
    });

    const result = await parseSafeJSON(response);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("codef-card-sync 오류:", error);
    return new Response(
      JSON.stringify({ error: error.message, result: { code: "ERROR", message: error.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
