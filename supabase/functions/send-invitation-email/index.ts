import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS 헤더 설정
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InvitationEmailRequest {
  email: string;
  companyName: string;
  role: string;
  department?: string;
  jobTitle?: string;
  inviterName?: string;
  signupUrl: string;
  tenantId: string;
}

const getRoleLabel = (role: string): string => {
  switch (role) {
    case "company_admin":
      return "관리자";
    case "manager":
      return "매니저";
    default:
      return "사원";
  }
};

const handler = async (req: Request): Promise<Response> => {
  // 1. CORS 프리플라이트(사전 검사) 요청 처리
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    // Authentication check - verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user's token
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resend API 키 확인
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY가 설정되지 않았습니다.");
    }
    const resend = new Resend(resendKey);

    // 요청 데이터 파싱
    const {
      email,
      companyName,
      role,
      department,
      jobTitle,
      inviterName,
      signupUrl,
      tenantId,
    }: InvitationEmailRequest = await req.json();

    // Input validation
    if (!email || !companyName || !role || !signupUrl || !tenantId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, companyName, role, signupUrl, tenantId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is a company_admin for the tenant
    const { data: membership, error: membershipError } = await supabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: "Not authorized to send invitations for this tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (membership.role !== "company_admin") {
      // Check if user is super admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("system_role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.system_role !== "sys_super_admin") {
        return new Response(
          JSON.stringify({ error: "Only company admins can send invitation emails" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Sending invitation email to: ${email} for company: ${companyName}`);

    const roleLabel = getRoleLabel(role);
    const positionInfo = [department, jobTitle].filter(Boolean).join(" · ");

    // 이메일 발송
    const { data, error: sendError } = await resend.emails.send({
      from: "Boteda OS <onboarding@resend.dev>",
      to: [email],
      subject: `[Boteda OS] ${companyName}에서 초대합니다`,
      html: `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
              <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-weight: bold; font-size: 24px;">B</span>
                </div>
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Boteda OS</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">엔터테인먼트 기업 통합 관리 솔루션</p>
            </div>
            
            <div style="background: white; border-radius: 0 0 16px 16px; padding: 40px 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              <h2 style="color: #18181b; margin: 0 0 24px 0; font-size: 22px; font-weight: 600;">
                🎉 ${companyName}에서 초대했습니다
              </h2>
              
              <p style="color: #52525b; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                ${inviterName ? `${inviterName}님이` : '회사 관리자가'} 귀하를 <strong>${companyName}</strong>의 ${roleLabel}로 초대했습니다.
              </p>
              
              ${positionInfo ? `
              <div style="background: #f4f4f5; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="color: #71717a; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">배정된 직책</p>
                <p style="color: #18181b; margin: 0; font-size: 16px; font-weight: 600;">${positionInfo}</p>
              </div>
              ` : ''}
              
              <p style="color: #52525b; margin: 0 0 32px 0; font-size: 15px; line-height: 1.6;">
                아래 버튼을 클릭하여 회원가입을 완료하시면, 바로 ${companyName} 시스템에 접속하실 수 있습니다.
              </p>
              
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.4);">
                  회원가입 하기
                </a>
              </div>
              
              <div style="border-top: 1px solid #e4e4e7; padding-top: 24px;">
                <p style="color: #a1a1aa; margin: 0; font-size: 13px; line-height: 1.5;">
                  이 초대는 7일 후 만료됩니다.<br>
                  본인이 요청하지 않은 초대라면 이 이메일을 무시하셔도 됩니다.
                </p>
              </div>
            </div>
            
            <p style="text-align: center; color: #a1a1aa; margin: 24px 0 0 0; font-size: 12px;">
              © 2025 Boteda OS. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (sendError) throw sendError;

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-invitation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);