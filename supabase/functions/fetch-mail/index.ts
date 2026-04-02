import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// External Supabase (where all app data lives)
const EXTERNAL_SUPABASE_URL = Deno.env.get("EXTERNAL_SUPABASE_URL") || "https://matcnptzugnaisuhowbk.supabase.co";
const EXTERNAL_SUPABASE_SERVICE_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY") || "";
const EXTERNAL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hdGNucHR6dWduYWlzdWhvd2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTU3MDEsImV4cCI6MjA4Njk5MTcwMX0.M4jrLYUrbFgGaKWTda1e1iLAfdMcU8oZSxsTC65DBnA";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Verify user via external Supabase auth
    const userClient = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = user.id;

    // Admin client for DB access (bypasses RLS)
    const adminClient = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_SERVICE_KEY);

    const body = await req.json();
    const { action, configId, provider, page, maxResults, folder } = body;

    // Fetch user's mail config (verify ownership)
    const { data: config, error: configError } = await adminClient
      .from("user_mail_configs")
      .select("*")
      .eq("id", configId)
      .eq("user_id", userId)
      .single();

    if (configError || !config) {
      return jsonResponse({ error: "메일 설정을 찾을 수 없습니다." }, 404);
    }

    if (action === "test") {
      if (provider === "gmail") {
        return jsonResponse(await testGmail(config, adminClient));
      } else if (provider === "naverworks") {
        return jsonResponse(await testNaverWorks(config));
      }
    }

    if (action === "list") {
      if (provider === "gmail") {
        return jsonResponse(await listGmail(config, adminClient, maxResults || 20, page, folder));
      } else if (provider === "naverworks") {
        return jsonResponse(await listNaverWorks(config, maxResults || 20, page, folder));
      }
    }

    if (action === "read") {
      const { messageId } = body;
      if (provider === "gmail") {
        return jsonResponse(await readGmail(config, adminClient, messageId));
      } else if (provider === "naverworks") {
        return jsonResponse(await readNaverWorks(config, messageId));
      }
    }

    if (action === "modify") {
      const { messageIds, addLabelIds, removeLabelIds } = body;
      if (provider === "gmail") {
        return jsonResponse(await modifyGmail(config, adminClient, messageIds, addLabelIds, removeLabelIds));
      }
      return jsonResponse({ error: "이 제공자에서는 지원하지 않는 기능입니다." }, 400);
    }

    if (action === "trash") {
      const { messageIds } = body;
      if (provider === "gmail") {
        return jsonResponse(await trashGmail(config, adminClient, messageIds));
      }
      return jsonResponse({ error: "이 제공자에서는 지원하지 않는 기능입니다." }, 400);
    }

    if (action === "send") {
      const { to, subject, htmlBody, replyToMessageId } = body;
      if (provider === "gmail") {
        return jsonResponse(await sendGmail(config, adminClient, to, subject, htmlBody, replyToMessageId));
      }
      return jsonResponse({ error: "이 제공자에서는 지원하지 않는 기능입니다." }, 400);
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (e) {
    console.error("fetch-mail error:", e);
    return jsonResponse({ error: e.message || "Internal server error" }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Gmail helpers ───

async function getGmailAccessToken(config: any, adminClient: any): Promise<string> {
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

async function testGmail(config: any, adminClient: any) {
  try {
    const accessToken = await getGmailAccessToken(config, adminClient);
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function listGmail(config: any, adminClient: any, maxResults: number, pageToken?: string, folder?: string) {
  const accessToken = await getGmailAccessToken(config, adminClient);

  // Map folder to Gmail label
  const labelId = folder || "INBOX";
  let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=${labelId}`;
  if (pageToken) url += `&pageToken=${pageToken}`;

  const listRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) throw new Error(`Gmail list error: ${listRes.status}`);
  const listData = await listRes.json();

  if (!listData.messages || listData.messages.length === 0) {
    return { mails: [], nextPageToken: null };
  }

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

async function readGmail(config: any, adminClient: any, messageId: string) {
  const accessToken = await getGmailAccessToken(config, adminClient);
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail read error: ${res.status}`);
  const data = await res.json();

  const headers = data.payload?.headers || [];
  const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || "";

  let body = "";

  const decodeBase64Utf8 = (data: string): string => {
    const binary = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  };

  const extractBody = (part: any): string => {
    if (part.mimeType === "text/html" && part.body?.data) {
      return decodeBase64Utf8(part.body.data);
    }
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64Utf8(part.body.data);
    }
    if (part.parts) {
      // Prefer HTML over plain text
      for (const sub of part.parts) {
        const result = extractBody(sub);
        if (result) return result;
      }
    }
    return "";
  };
  body = extractBody(data.payload);

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

async function getNaverWorksToken(config: any): Promise<string> {
  const clientId = config.nw_client_id;
  const serviceAccount = config.nw_service_account;
  const privateKey = config.nw_private_key;
  const domainId = config.nw_domain_id;

  if (!clientId || !serviceAccount || !privateKey || !domainId) {
    throw new Error("네이버웍스 OAuth 설정 키가 누락되었습니다.");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientId,
    sub: serviceAccount,
    aud: "https://auth.worksmobile.com/oauth2/v2.0/token",
    iat: now,
    exp: now + 3600,
    "https://auth.worksmobile.com/claims/domain_id": domainId,
  };

  const jwt = await signJwt(payload, privateKey);

  const tokenRes = await fetch("https://auth.worksmobile.com/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
      client_id: clientId,
      scope: "mail.read",
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`네이버웍스 토큰 발급 실패: ${tokenData.error_description || tokenData.error || JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

async function testNaverWorks(config: any) {
  try {
    const accessToken = await getNaverWorksToken(config);
    const userId = config.nw_user_id || config.nw_service_account;
    if (!userId) throw new Error("테스트를 위한 사용자 ID가 설정되지 않았습니다.");

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

async function listNaverWorks(config: any, maxResults: number, page?: number, folder?: string) {
  const accessToken = await getNaverWorksToken(config);
  const userId = config.nw_user_id || config.nw_service_account;

  // Map folder names for NaverWorks
  const folderMap: Record<string, string> = { INBOX: "INBOX", SENT: "SENT", TRASH: "TRASH", STARRED: "INBOX" };
  const folderId = folderMap[folder || "INBOX"] || "INBOX";

  const offset = (page || 0) * maxResults;
  const res = await fetch(
    `https://www.worksapis.com/v1.0/users/${encodeURIComponent(userId)}/mail/messages?folderId=${folderId}&count=${maxResults}&offset=${offset}`,
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

// ─── Gmail modify/trash helpers ───

async function modifyGmail(config: any, adminClient: any, messageIds: string[], addLabelIds?: string[], removeLabelIds?: string[]) {
  const accessToken = await getGmailAccessToken(config, adminClient);
  const results: any[] = [];

  for (const msgId of messageIds) {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/modify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        addLabelIds: addLabelIds || [],
        removeLabelIds: removeLabelIds || [],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      results.push({ id: msgId, success: false, error: err });
    } else {
      results.push({ id: msgId, success: true });
    }
  }
  return { success: true, results };
}

async function trashGmail(config: any, adminClient: any, messageIds: string[]) {
  const accessToken = await getGmailAccessToken(config, adminClient);
  const results: any[] = [];

  for (const msgId of messageIds) {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/trash`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      results.push({ id: msgId, success: false, error: err });
    } else {
      results.push({ id: msgId, success: true });
    }
  }
  return { success: true, results };
}

// ─── Gmail send helper ───

function buildRfc2822(from: string, to: string, subject: string, htmlBody: string, replyToMessageId?: string): string {
  const boundary = "boundary_" + crypto.randomUUID().replace(/-/g, "");
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
  ];

  if (replyToMessageId) {
    headers.push(`In-Reply-To: ${replyToMessageId}`);
    headers.push(`References: ${replyToMessageId}`);
  }

  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
  headers.push("");

  const plainText = htmlBody.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

  const body = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    "",
    btoa(unescape(encodeURIComponent(plainText))),
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    "",
    btoa(unescape(encodeURIComponent(htmlBody))),
    "",
    `--${boundary}--`,
  ];

  return headers.join("\r\n") + "\r\n" + body.join("\r\n");
}

function base64UrlEncodeBytes(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendGmail(config: any, adminClient: any, to: string, subject: string, htmlBody: string, replyToMessageId?: string) {
  const accessToken = await getGmailAccessToken(config, adminClient);

  // Get sender email
  const fromEmail = config.google_email || "me";
  const raw = buildRfc2822(fromEmail, to, subject, htmlBody, replyToMessageId);

  // Gmail API expects web-safe base64
  const encoded = base64UrlEncodeBytes(raw);

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail 발송 실패: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  return { success: true, messageId: data.id };
}
