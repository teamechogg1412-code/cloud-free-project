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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { action, configId, provider, page, maxResults } = body;

    // Fetch user's mail config
    const { data: config, error: configError } = await supabase
      .from("user_mail_configs")
      .select("*")
      .eq("id", configId)
      .eq("user_id", userId)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: "메일 설정을 찾을 수 없습니다." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "test") {
      // Test connection
      if (provider === "gmail") {
        const result = await testGmail(config);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (provider === "naverworks") {
        const result = await testNaverWorks(config);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "list") {
      // List mails
      if (provider === "gmail") {
        const result = await listGmail(config, maxResults || 20, page);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (provider === "naverworks") {
        const result = await listNaverWorks(config, maxResults || 20, page);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "read") {
      const { messageId } = body;
      if (provider === "gmail") {
        const result = await readGmail(config, messageId);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (provider === "naverworks") {
        const result = await readNaverWorks(config, messageId);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-mail error:", e);
    return new Response(JSON.stringify({ error: e.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Gmail helpers ───

async function getGmailAccessToken(config: any): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data: tenantConfigs } = await adminClient
    .from("tenant_api_configs")
    .select("config_key, config_value")
    .eq("tenant_id", config.tenant_id)
    .in("config_key", ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);

  const clientId = tenantConfigs?.find((c: any) => c.config_key === "GOOGLE_CLIENT_ID")?.config_value;
  const clientSecret = tenantConfigs?.find((c: any) => c.config_key === "GOOGLE_CLIENT_SECRET")?.config_value;

  if (!clientId || !clientSecret || !config.google_refresh_token) {
    throw new Error("Google OAuth 설정이 불완전합니다. 관리자에게 GOOGLE_CLIENT_ID/SECRET 등록을 요청하세요.");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: config.google_refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error("Gmail 토큰 갱신 실패: " + (tokenData.error_description || tokenData.error));
  }

  return tokenData.access_token;
}

async function testGmail(config: any) {
  try {
    const accessToken = await getGmailAccessToken(config);
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function listGmail(config: any, maxResults: number, pageToken?: string) {
  const accessToken = await getGmailAccessToken(config);

  let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
  if (pageToken) url += `&pageToken=${pageToken}`;

  const listRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) throw new Error(`Gmail list error: ${listRes.status}`);
  const listData = await listRes.json();

  if (!listData.messages || listData.messages.length === 0) {
    return { mails: [], nextPageToken: null };
  }

  // Fetch metadata for each message (batch)
  const mails = await Promise.all(
    listData.messages.slice(0, maxResults).map(async (msg: any) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!msgRes.ok) return null;
      const msgData = await msgRes.json();

      const headers = msgData.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || "";

      return {
        id: msg.id,
        subject: getHeader("Subject") || "(제목 없음)",
        sender: getHeader("From"),
        date: getHeader("Date"),
        snippet: msgData.snippet || "",
        unread: msgData.labelIds?.includes("UNREAD") || false,
      };
    }),
  );

  return {
    mails: mails.filter(Boolean),
    nextPageToken: listData.nextPageToken || null,
  };
}

async function readGmail(config: any, messageId: string) {
  const accessToken = await getGmailAccessToken(config);
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail read error: ${res.status}`);
  const data = await res.json();

  const headers = data.payload?.headers || [];
  const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || "";

  // Extract body
  let body = "";
  const extractBody = (part: any): string => {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    }
    if (part.mimeType === "text/html" && part.body?.data) {
      return atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    }
    if (part.parts) {
      for (const sub of part.parts) {
        const result = extractBody(sub);
        if (result) return result;
      }
    }
    return "";
  };
  body = extractBody(data.payload);

  // Extract attachments info
  const attachments: any[] = [];
  const extractAttachments = (part: any) => {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        id: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
      });
    }
    if (part.parts) part.parts.forEach(extractAttachments);
  };
  extractAttachments(data.payload);

  return {
    id: data.id,
    subject: getHeader("Subject"),
    sender: getHeader("From"),
    to: getHeader("To"),
    date: getHeader("Date"),
    body,
    attachments,
  };
}

// ─── NaverWorks helpers ───

// --- JWT 서명 및 토큰 발급을 위한 유틸리티 함수 (backup-to-drive에서 복사) ---
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

async function signJwt(payload: any, privateKeyPem: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(signatureInput));

  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${signatureInput}.${encodedSignature}`;
}
// --- JWT 서명 및 토큰 발급을 위한 유틸리티 함수 끝 ---

async function getNaverWorksToken(config: any): Promise<string> {
  const clientId = config.nw_client_id;
  const serviceAccount = config.nw_service_account;
  const privateKey = config.nw_private_key;
  const domainId = config.nw_domain_id;

  if (!clientId || !serviceAccount || !privateKey || !domainId) {
    throw new Error(
      "네이버웍스 OAuth 설정 키가 누락되었습니다 (Client ID, Service Account, Private Key, Domain ID 확인 필요).",
    );
  }

  // 1. JWT Assertion 생성
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientId,
    sub: serviceAccount,
    aud: "https://auth.worksmobile.com/oauth2/v2.0/token",
    iat: now,
    exp: now + 3600, // 1시간 유효
    // 네이버웍스 JWT 전용 클레임 (Domain ID 사용)
    "https://auth.worksmobile.com/claims/domain_id": domainId,
  };

  const jwt = await signJwt(payload, privateKey);

  // 2. JWT를 이용해 Access Token 요청 (Grant Type: urn:ietf:params:oauth:grant-type:jwt-bearer)
  const tokenRes = await fetch("https://auth.worksmobile.com/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
      client_id: clientId, // Client ID도 함께 전송해야 함
      scope: "mail.read",
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    // 에러 발생 시 네이버웍스 서버 응답 메시지를 포함하여 에러 발생
    throw new Error(
      `네이버웍스 토큰 발급 실패: ${tokenData.error_description || tokenData.error || JSON.stringify(tokenData)}`,
    );
  }

  return tokenData.access_token;
}

async function testNaverWorks(config: any) {
  try {
    // 테스트 시에는 유저 ID 대신 Service Account를 사용해 토큰을 받아옴
    const accessToken = await getNaverWorksToken(config);

    // 토큰으로 사용자 정보 조회 (Test)
    const userId = config.nw_user_id || config.nw_service_account;
    if (!userId) throw new Error("테스트를 위한 사용자 ID(nw_user_id)가 설정되지 않았습니다.");

    const res = await fetch(
      `https://www.worksapis.com/v1.0/users/${encodeURIComponent(userId)}/mail/messages?folderId=INBOX&count=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) throw new Error(`NaverWorks API Test Error: ${res.status}`);

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function listNaverWorks(config: any, maxResults: number, page?: number) {
  const accessToken = await getNaverWorksToken(config);
  const userId = config.nw_user_id || config.nw_service_account;

  const offset = (page || 0) * maxResults;
  const res = await fetch(
    `https://www.worksapis.com/v1.0/users/${encodeURIComponent(userId)}/mail/messages?folderId=INBOX&count=${maxResults}&offset=${offset}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NaverWorks mail list error: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const mails = (data.messages || data.mails || []).map((m: any) => ({
    id: m.mailId || m.id,
    subject: m.subject || "(제목 없음)",
    sender: m.from?.name ? `${m.from.name} <${m.from.address}>` : m.from?.address || "",
    date: m.receivedDate || m.sentDate || "",
    snippet: m.body?.substring(0, 100) || "",
    unread: !m.isRead,
  }));

  return { mails, nextPage: mails.length === maxResults ? (page || 0) + 1 : null };
}

async function readNaverWorks(config: any, messageId: string) {
  const accessToken = await getNaverWorksToken(config);
  const userId = config.nw_user_id || config.nw_service_account;

  const res = await fetch(
    `https://www.worksapis.com/v1.0/users/${encodeURIComponent(userId)}/mail/messages/${messageId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) throw new Error(`NaverWorks read error: ${res.status}`);
  const data = await res.json();

  return {
    id: data.mailId || data.id,
    subject: data.subject,
    sender: data.from?.name ? `${data.from.name} <${data.from.address}>` : data.from?.address || "",
    to: data.to?.map((t: any) => t.address).join(", ") || "",
    date: data.receivedDate || data.sentDate || "",
    body: data.body || "",
    attachments: (data.attachments || []).map((a: any) => ({
      id: a.attachmentId,
      filename: a.fileName,
      mimeType: a.contentType,
      size: a.size,
    })),
  };
}
