import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user is a sys_super_admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super admin role via DB
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("system_role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.system_role !== "sys_super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Super admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || (req.method === "GET" ? "list" : "update");

    if (action === "list" || req.method === "GET") {
      // Fetch configs but MASK the actual values
      const { data, error } = await supabaseAdmin
        .from("system_configs")
        .select("key, value, description, category")
        .order("category");

      if (error) throw error;

      // Mask sensitive values - only return whether a value is set, not the actual value
      const maskedData = (data || []).map((item) => ({
        key: item.key,
        // Return masked value: show first 3 chars + asterisks if value exists
        value: item.value && item.value.trim().length > 0
          ? item.value.substring(0, 3) + "••••••••••••••••"
          : "",
        is_set: item.value && item.value.trim().length > 0,
        description: item.description,
        category: item.category,
      }));

      return new Response(JSON.stringify({ data: maskedData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { key, value } = body;

      if (!key || typeof key !== "string" || key.length > 100) {
        return new Response(JSON.stringify({ error: "Invalid key" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (typeof value !== "string" || value.length > 5000) {
        return new Response(JSON.stringify({ error: "Invalid value" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only allow updating existing keys, not creating new ones
      const { data: existing } = await supabaseAdmin
        .from("system_configs")
        .select("key")
        .eq("key", key)
        .single();

      if (!existing) {
        return new Response(JSON.stringify({ error: "Config key not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseAdmin
        .from("system_configs")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("manage-system-config error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
