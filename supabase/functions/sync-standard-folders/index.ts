import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DriveTemplate = {
  category: string;
  menu_name: string;
  folder_key: string;
  sort_order: number;
};

const DEFAULT_DRIVE_TEMPLATES: DriveTemplate[] = [
  { category: "매니지먼트", menu_name: "시나리오 분석", folder_key: "mgmt_scenario_analysis", sort_order: 1 },
  { category: "매니지먼트", menu_name: "계약서 분석", folder_key: "mgmt_contract_analysis", sort_order: 2 },
  { category: "매니지먼트", menu_name: "현장 검토 사항", folder_key: "mgmt_field_review", sort_order: 3 },
  { category: "홍보", menu_name: "원고생성", folder_key: "pr_copywriting", sort_order: 10 },
  { category: "홍보", menu_name: "프로필 제작", folder_key: "pr_profile", sort_order: 11 },
  { category: "홍보", menu_name: "키워드 알림", folder_key: "pr_keyword_alert", sort_order: 12 },
  { category: "마케팅", menu_name: "마케팅 전략", folder_key: "marketing_strategy", sort_order: 20 },
  { category: "마케팅", menu_name: "성과보고서", folder_key: "marketing_report", sort_order: 21 },
  { category: "마케팅", menu_name: "캠페인 관리", folder_key: "marketing_campaign", sort_order: 22 },
  { category: "재무", menu_name: "외부청구함", folder_key: "finance_external_invoice", sort_order: 30 },
  { category: "재무", menu_name: "기안서", folder_key: "finance_draft", sort_order: 31 },
  { category: "재무", menu_name: "지출결의서", folder_key: "finance_expense_resolution", sort_order: 32 },
  { category: "재무", menu_name: "월간예산", folder_key: "finance_monthly_budget", sort_order: 33 },
  { category: "인사", menu_name: "휴가신청", folder_key: "hr_leave_request", sort_order: 40 },
  { category: "인사", menu_name: "휴가 관리", folder_key: "hr_leave_management", sort_order: 41 },
  { category: "인사", menu_name: "출퇴근", folder_key: "hr_attendance", sort_order: 42 },
  { category: "공용", menu_name: "통합 스케줄러", folder_key: "common_scheduler", sort_order: 50 },
  { category: "공용", menu_name: "규정", folder_key: "common_regulations", sort_order: 51 },
  { category: "공용", menu_name: "프로젝트 정보", folder_key: "common_project_info", sort_order: 52 },
  { category: "공용", menu_name: "문서&회의록", folder_key: "common_documents_minutes", sort_order: 53 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tenantId } = await req.json();
    if (!tenantId) throw new Error("tenantId is required");

    // 외부 Supabase 클라이언트 (실제 데이터가 있는 곳)
    const extUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const extKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("DEBUG - EXTERNAL_SUPABASE_URL exists:", !!extUrl);
    console.log("DEBUG - EXTERNAL_SUPABASE_URL value:", extUrl);
    console.log("DEBUG - EXTERNAL_SUPABASE_SERVICE_ROLE_KEY exists:", !!extKey);
    console.log("DEBUG - tenantId:", tenantId);
    
    if (!extUrl || !extKey) {
      throw new Error("외부 DB 시크릿이 설정되지 않았습니다. EXTERNAL_SUPABASE_URL=" + (extUrl || "없음"));
    }
    
    const authHeader = req.headers.get("Authorization");
    console.log("DEBUG - auth header exists:", !!authHeader);
    const supabase = createClient(extUrl, extKey);
    const userScopedClient = authHeader
      ? createClient(extUrl, extKey, {
          global: {
            headers: {
              Authorization: authHeader,
            },
          },
        })
      : null;

    let tenant: any = null;
    let tenantError: any = null;

    const firstQuery = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .maybeSingle();

    tenant = firstQuery.data;
    tenantError = firstQuery.error;

    // extKey가 service role이 아니면 RLS로 인해 null일 수 있어, 사용자 토큰으로 재시도
    if (!tenant && !tenantError && userScopedClient) {
      console.log("DEBUG - retry tenant query with user auth header");
      const retryQuery = await userScopedClient
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .maybeSingle();

      tenant = retryQuery.data;
      tenantError = retryQuery.error;
    }

    console.log("DEBUG - tenant query result:", tenant ? "found" : "null");
    console.log("DEBUG - tenant error:", tenantError);
    console.log("DEBUG - google_credentials exists:", !!tenant?.google_credentials);

    if (tenantError) {
      console.error("Tenant query error:", tenantError);
      throw new Error("테넌트 조회 실패: " + tenantError.message);
    }

    if (!tenant) {
      throw new Error("테넌트를 찾을 수 없습니다. tenantId: " + tenantId);
    }

    if (!tenant.google_credentials) {
      throw new Error("해당 회사의 Google Drive 설정이 완료되지 않았습니다. tenant name: " + (tenant.name || "unknown"));
    }

    // google_credentials 파싱 (base64 또는 plain JSON)
    let credentials;
    try {
      // base64로 저장된 경우
      credentials = JSON.parse(atob(tenant.google_credentials));
    } catch {
      try {
        // plain JSON 문자열로 저장된 경우
        credentials = typeof tenant.google_credentials === 'string'
          ? JSON.parse(tenant.google_credentials)
          : tenant.google_credentials;
      } catch {
        throw new Error("Google 자격증명 파싱 실패");
      }
    }

    // 서비스 계정 자체 권한으로 Drive API 사용 (impersonation 불필요)
    const accessToken = await getGoogleAccessToken(credentials, null);

    // drive_folder_id가 없으면 루트에 테넌트명 폴더 생성
    let rootFolderId = tenant.drive_folder_id;
    if (!rootFolderId) {
      rootFolderId = await getOrCreateFolder(accessToken, 'root', tenant.name || tenantId);
      await supabase.from("tenants").update({ drive_folder_id: rootFolderId }).eq("id", tenantId);
    }

    // 2. 시스템 표준 템플릿 가져오기
    let templates: DriveTemplate[] = [];
    const { data: rawTemplates } = await supabase
      .from("system_drive_templates")
      .select("category, menu_name, folder_key, sort_order")
      .order("sort_order");

    templates = (rawTemplates as DriveTemplate[] | null) ?? [];

    // extKey 권한 문제로 비어있을 수 있어 사용자 토큰으로 한 번 더 조회
    if (templates.length === 0 && userScopedClient) {
      const { data: retryTemplates } = await userScopedClient
        .from("system_drive_templates")
        .select("category, menu_name, folder_key, sort_order")
        .order("sort_order");
      templates = (retryTemplates as DriveTemplate[] | null) ?? [];
    }

    // 외부 DB에 템플릿이 없어도 기본 템플릿으로 진행
    if (templates.length === 0) {
      console.log("DEBUG - fallback to DEFAULT_DRIVE_TEMPLATES");
      templates = DEFAULT_DRIVE_TEMPLATES;
    }

    const categories = [...new Set(templates.map((t) => t.category))];
    const results = [];

    // 3. 카테고리별 폴더 생성
    for (const cat of categories) {
      const catFolderId = await getOrCreateFolder(accessToken, rootFolderId, cat);

      const menuItems = templates.filter((t: any) => t.category === cat);
      for (const item of menuItems) {
        const menuFolderId = await getOrCreateFolder(accessToken, catFolderId, item.menu_name);

        // 4. DB 매핑 테이블에 저장 (upsert)
        const { error: mappingError } = await supabase.from("drive_folder_mappings").upsert({
          tenant_id: tenantId,
          folder_key: item.folder_key,
          folder_id: menuFolderId,
          folder_name: item.menu_name,
          folder_path: `${cat}/${item.menu_name}`,
          is_active: true
        }, { onConflict: "tenant_id,folder_key" });

        if (mappingError) {
          console.error("Mapping upsert error:", mappingError);
        }
        results.push({ menu: item.menu_name, id: menuFolderId, error: mappingError?.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("sync-standard-folders error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// 구글 드라이브 폴더 생성 또는 조회
async function getOrCreateFolder(token: string, parentId: string, folderName: string): Promise<string> {
  const query = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const searchResult = await searchRes.json();

  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: folderName, mimeType: "application/vnd.google-apps.folder", parents: [parentId] })
  });
  const folder = await createRes.json();
  if (!folder.id) {
    throw new Error(`폴더 생성 실패 (${folderName}): ${JSON.stringify(folder)}`);
  }
  return folder.id;
}

// Google OAuth2 Access Token (서비스 계정 JWT 서명)
async function getGoogleAccessToken(credentials: {
  client_email: string;
  private_key: string;
}, impersonateEmail: string | null): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  if (impersonateEmail) {
    payload.sub = impersonateEmail;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(credentials.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${signatureInput}.${encodedSignature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    console.error("Token response:", tokenData);
    throw new Error("Google Access Token 발급 실패: " + JSON.stringify(tokenData));
  }

  return tokenData.access_token;
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}
