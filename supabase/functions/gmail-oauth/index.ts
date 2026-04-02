import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// External Supabase project credentials (where all app data lives)
const EXTERNAL_SUPABASE_URL = Deno.env.get("EXTERNAL_SUPABASE_URL") || "https://matcnptzugnaisuhowbk.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hdGNucHR6dWduYWlzdWhvd2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTU3MDEsImV4cCI6MjA4Njk5MTcwMX0.M4jrLYUrbFgGaKWTda1e1iLAfdMcU8oZSxsTC65DBnA";
const EXTERNAL_SUPABASE_SERVICE_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const authHeader = req.headers.get("Authorization");

    // User-scoped client for auth verification
    const userClient = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    // Service-role client for DB reads/writes (bypasses RLS)
    const adminClient = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_SERVICE_KEY);

    // ── Action 1: Generate OAuth URL ──
    if (action === "get_auth_url") {
      if (!authHeader?.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const { tenantId, redirectUri } = body;
      if (!tenantId || !redirectUri) {
        return jsonResponse({ error: "tenantId and redirectUri are required" }, 400);
      }

      // Get Google OAuth credentials from tenant_api_configs using admin client
      const { data: tenantConfigs } = await adminClient
        .from("tenant_api_configs")
        .select("config_key, config_value")
        .eq("tenant_id", tenantId)
        .in("config_key", ["GOOGLE_CLIENT_ID"]);

      const clientId = tenantConfigs?.find((c: any) => c.config_key === "GOOGLE_CLIENT_ID")?.config_value;
      if (!clientId) {
        return jsonResponse({ error: "GOOGLE_CLIENT_ID가 설정되지 않았습니다. 관리자에게 문의하세요." }, 400);
      }

      const userEmail = user.email || "";
      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/calendar",
        "openid",
        "email",
      ].join(" ");
      const state = crypto.randomUUID();

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "select_account consent");
      authUrl.searchParams.set("include_granted_scopes", "true");
      authUrl.searchParams.set("state", state);
      if (userEmail) authUrl.searchParams.set("login_hint", userEmail);

      return jsonResponse({ authUrl: authUrl.toString(), state });
    }

    // ── Action 2: Exchange code for tokens ──
    if (action === "exchange_code") {
      if (!authHeader?.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      const userId = user.id;

      const { code, tenantId, redirectUri } = body;
      if (!code || !tenantId || !redirectUri) {
        return jsonResponse({ error: "code, tenantId, redirectUri are required" }, 400);
      }

      // Get Google OAuth credentials using admin client
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

      // Upsert into user_mail_configs using admin client (bypasses RLS)
      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

      // Check existing
      const { data: existing } = await adminClient
        .from("user_mail_configs")
        .select("id")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .eq("provider", "gmail")
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await adminClient.from("user_mail_configs").update({
          google_email: googleEmail,
          google_refresh_token: tokenData.refresh_token,
          google_access_token: tokenData.access_token,
          google_token_expiry: expiresAt,
          is_active: true,
        }).eq("id", existing.id);
        if (updateError) {
          console.error("Update error:", updateError);
          return jsonResponse({ error: "메일 설정 업데이트 실패: " + updateError.message }, 500);
        }
      } else {
        const { error: insertError } = await adminClient.from("user_mail_configs").insert({
          user_id: userId,
          tenant_id: tenantId,
          provider: "gmail",
          google_email: googleEmail,
          google_refresh_token: tokenData.refresh_token,
          google_access_token: tokenData.access_token,
          google_token_expiry: expiresAt,
        });
        if (insertError) {
          console.error("Insert error:", insertError);
          return jsonResponse({ error: "메일 설정 저장 실패: " + insertError.message }, 500);
        }
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
