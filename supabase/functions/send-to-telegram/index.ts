import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TelegramRequest {
  tenantId: string;
  fileName: string;
  fileContent: string; // base64 encoded
  mimeType: string;
  caption?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = claimsData.claims.sub as string;

    const { tenantId, fileName, fileContent, mimeType, caption }: TelegramRequest = await req.json();

    if (!tenantId || !fileName || !fileContent) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check membership
    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Not a member of this tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Telegram bot config from tenant_api_configs
    const { data: configs } = await supabase
      .from("tenant_api_configs")
      .select("config_key, config_value")
      .eq("tenant_id", tenantId)
      .in("config_key", ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"]);

    const configMap = new Map((configs || []).map((c: any) => [c.config_key, c.config_value]));
    const botToken = configMap.get("TELEGRAM_BOT_TOKEN");
    const chatId = configMap.get("TELEGRAM_CHAT_ID");

    if (!botToken || !chatId) {
      return new Response(
        JSON.stringify({ success: false, error: "Telegram bot not configured for this tenant" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode base64 to binary
    const binaryString = atob(fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Get tenant name for caption
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();

    const fullCaption = caption || 
      `📎 ${fileName}\n🏢 ${tenant?.name || "Unknown"}\n👤 ${profile?.full_name || profile?.email || "Unknown"}\n📅 ${new Date().toISOString().split("T")[0]}`;

    // Send document to Telegram
    const blob = new Blob([bytes], { type: mimeType || "application/octet-stream" });
    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("document", blob, fileName);
    formData.append("caption", fullCaption);

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendDocument`,
      { method: "POST", body: formData }
    );

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      console.error("Telegram API error:", telegramResult);
      return new Response(
        JSON.stringify({ success: false, error: `Telegram error: ${telegramResult.description}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: telegramResult.result?.message_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Telegram send error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
