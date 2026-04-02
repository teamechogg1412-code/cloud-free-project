import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const extUrl = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const extServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(extUrl, extServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller using the external Supabase auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use admin client to verify the token from external Supabase
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is company_admin or super_admin
    const { data: callerProfile } = await adminClient
      .from("profiles").select("system_role").eq("id", caller.id).single();

    const body = await req.json();
    const { email, full_name, department, job_title, role, tenant_id, temp_password } = body;

    if (!email || !tenant_id) {
      return new Response(JSON.stringify({ error: "email and tenant_id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSuperAdmin = callerProfile?.system_role === "sys_super_admin";

    if (!isSuperAdmin) {
      const { data: callerMembership } = await adminClient
        .from("tenant_memberships").select("role")
        .eq("tenant_id", tenant_id).eq("user_id", caller.id).single();

      if (!callerMembership || callerMembership.role !== "company_admin") {
        return new Response(JSON.stringify({ error: "Only admins can create employees" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create auth user with default password
    const password = temp_password || "슈퍼패스@#!8";
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email.split("@")[0] },
    });

    if (createErr) {
      // If user already exists, try to find and add membership
      if (createErr.message?.includes("already been registered") || createErr.message?.includes("already exists")) {
        const { data: { users } } = await adminClient.auth.admin.listUsers();
        const existingUser = users?.find((u: any) => u.email === email);
        if (!existingUser) {
          return new Response(JSON.stringify({ error: "User exists but could not be found" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if membership already exists
        const { data: existingMembership } = await adminClient
          .from("tenant_memberships")
          .select("id").eq("tenant_id", tenant_id).eq("user_id", existingUser.id).single();

        if (existingMembership) {
          return new Response(JSON.stringify({ error: "이미 등록된 직원입니다." }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create membership for existing user
        const { error: memberErr } = await adminClient.from("tenant_memberships").insert({
          user_id: existingUser.id,
          tenant_id,
          role: role || "employee",
          department: department || null,
          job_title: job_title || null,
        });

        if (memberErr) throw memberErr;

        return new Response(JSON.stringify({
          success: true,
          user_id: existingUser.id,
          message: "기존 사용자를 직원으로 등록했습니다.",
          is_existing: true,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      throw createErr;
    }

    const userId = newUser.user.id;

    // Update profile
    await adminClient.from("profiles").update({
      full_name: full_name || email.split("@")[0],
    }).eq("id", userId);

    // Create tenant membership
    const { error: memberErr } = await adminClient.from("tenant_memberships").insert({
      user_id: userId,
      tenant_id,
      role: role || "employee",
      department: department || null,
      job_title: job_title || null,
    });

    if (memberErr) throw memberErr;

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      temp_password: password,
      message: "직원 계정이 생성되었습니다.",
      is_existing: false,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("create-employee error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
