import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tenantId } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. 테넌트 정보 및 구글 자격증명 조회
    const { data: tenant } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
    if (!tenant?.google_credentials || !tenant?.drive_folder_id) {
      throw new Error("해당 회사의 Google Drive 설정이 완료되지 않았습니다.");
    }

    const credentials = JSON.parse(atob(tenant.google_credentials));
    const accessToken = await getGoogleAccessToken(credentials);

    // 2. 시스템 표준 템플릿 가져오기
    const { data: templates } = await supabase.from("system_drive_templates").select("*").order("sort_order");
    const categories = [...new Set(templates?.map(t => t.category))];

    const results = [];

    // 3. 카테고리별 폴더 생성 로직
    for (const cat of categories) {
      // 카테고리 폴더 생성 (예: '재무')
      const catFolderId = await getOrCreateFolder(accessToken, tenant.drive_folder_id, cat);
      
      const menuItems = templates?.filter(t => t.category === cat) || [];
      for (const item of menuItems) {
        // 메뉴 폴더 생성 (예: '재무' 안에 '지출결의서')
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

        if (!mappingError) results.push({ menu: item.menu_name, id: menuFolderId });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// 구글 드라이브 폴더 생성 또는 조회 함수
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
  return folder.id;
}

// Access Token 발급 함수 (기존 로직 재사용)
async function getGoogleAccessToken(creds: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600
  };
  // ... (JWT 서명 로직 - 기존 upload-to-drive 함수 참조)
  // 편의상 축약했으나 실제 파일엔 전체 JWT 서명 로직이 포함되어야 합니다.
  return "발급된_토큰"; 
}