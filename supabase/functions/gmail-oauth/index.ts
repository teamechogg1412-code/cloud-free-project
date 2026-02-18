import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json();
    const { action } = body;

    // ── Action 1: Generate OAuth URL ──
    if (action === "get_auth_url") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const { tenantId, redirectUri } = body;
      if (!tenantId || !redirectUri) {
        return jsonResponse({ error: "tenantId and redirectUri are required" }, 400);
      }

      // Get Google OAuth credentials from tenant_api_configs
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: tenantConfigs } = await adminClient
        .from("tenant_api_configs")
        .select("config_key, config_value")
        .eq("tenant_id", tenantId)
        .in("config_key", ["GOOGLE_CLIENT_ID"]);

      const clientId = tenantConfigs?.find((c: any) => c.config_key === "GOOGLE_CLIENT_ID")?.config_value;
      if (!clientId) {
        return jsonResponse({ error: "GOOGLE_CLIENT_ID가 설정되지 않았습니다. 관리자에게 문의하세요." }, 400);
      }

      const scopes = "https://www.googleapis.com/auth/gmail.readonly";
      const state = crypto.randomUUID();

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", state);

      return jsonResponse({ authUrl: authUrl.toString(), state });
    }

    // ── Action 2: Exchange code for tokens ──
    if (action === "exchange_code") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      const userId = claimsData.claims.sub;

      const { code, tenantId, redirectUri } = body;
      if (!code || !tenantId || !redirectUri) {
        return jsonResponse({ error: "code, tenantId, redirectUri are required" }, 400);
      }

      // Get Google OAuth credentials
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: tenantConfigs } = await adminClient
        .from("tenant_api_configs")
        .select("config_key, config_value")
        .eq("tenant_id", tenantId)
        .in("config_key", ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);

      const clientId = tenantConfigs?.find((c: any) => c.config_key === "GOOGLE_CLIENT_ID")?.config_value;
      const clientSecret = tenantConfigs?.find((c: any) => c.config_key === "GOOGLE_CLIENT_SECRET")?.config_value;

      if (!clientId || !clientSecret) {
        return jsonResponse({ error: "Google OAuth 설정이 불완전합니다." }, 400);
      }

      // Exchange authorization code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.refresh_token) {
        return jsonResponse({
          error: "토큰 발급 실패: " + (tokenData.error_description || tokenData.error || "refresh_token이 없습니다."),
        }, 400);
      }

      // Get user email from Google
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoRes.json();
      const googleEmail = userInfo.email || "";

      // Upsert into user_mail_configs
      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

      // Check existing
      const { data: existing } = await supabase
        .from("user_mail_configs")
        .select("id")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .eq("provider", "gmail")
        .maybeSingle();

      if (existing) {
        await supabase.from("user_mail_configs").update({
          google_email: googleEmail,
          google_refresh_token: tokenData.refresh_token,
          google_access_token: tokenData.access_token,
          google_token_expiry: expiresAt,
          is_active: true,
        }).eq("id", existing.id);
      } else {
        await supabase.from("user_mail_configs").insert({
          user_id: userId,
          tenant_id: tenantId,
          provider: "gmail",
          google_email: googleEmail,
          google_refresh_token: tokenData.refresh_token,
          google_access_token: tokenData.access_token,
          google_token_expiry: expiresAt,
        });
      }

      return jsonResponse({ success: true, email: googleEmail });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (e) {
    console.error("gmail-oauth error:", e);
    return jsonResponse({ error: e.message || "Internal server error" }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
