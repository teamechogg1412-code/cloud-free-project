import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tenantId, workId, workTitle } = await req.json();
    if (!tenantId || !workId || !workTitle) {
      throw new Error("tenantId, workId, workTitle are required");
    }

    const extUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const extKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
    if (!extUrl || !extKey) throw new Error("External DB not configured");

    const supabase = createClient(extUrl, extKey);

    // Get tenant's Google credentials and drive folder
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("google_credentials, drive_folder_id, name")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) throw new Error("Tenant not found");
    if (!tenant.google_credentials || !tenant.drive_folder_id) {
      throw new Error("Google Drive not configured for this tenant");
    }

    // Handle both raw JSON string and base64-encoded credentials
    let credentials;
    try {
      // Try parsing as raw JSON first
      credentials = typeof tenant.google_credentials === 'object' 
        ? tenant.google_credentials 
        : JSON.parse(tenant.google_credentials);
    } catch {
      // If not valid JSON, try base64 decode
      credentials = JSON.parse(atob(tenant.google_credentials));
    }
    const accessToken = await getGoogleAccessToken(credentials);

    // Create "작품" parent folder if not exists
    const worksFolderId = await getOrCreateFolder(accessToken, tenant.drive_folder_id, "작품");

    // Create work-specific shared folder
    const workFolderId = await getOrCreateFolder(accessToken, worksFolderId, workTitle);

    // Make folder publicly viewable (anyone with link can view)
    await setFolderPublicReadable(accessToken, workFolderId);

    // Get folder web link
    const folderLink = `https://drive.google.com/drive/folders/${workFolderId}`;

    // Save folder info to works table
    await supabase
      .from("works")
      .update({ drive_folder_id: workFolderId, drive_folder_link: folderLink })
      .eq("id", workId);

    return new Response(
      JSON.stringify({ success: true, folderId: workFolderId, folderLink }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getGoogleAccessToken(credentials: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

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
  if (!tokenData.access_token) throw new Error("Google Access Token 발급 실패: " + JSON.stringify(tokenData));
  return tokenData.access_token;
}

async function getOrCreateFolder(accessToken: string, parentId: string, name: string): Promise<string> {
  const q = `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchResp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchResult = await searchResp.json();
  if (searchResult.files?.length > 0) return searchResult.files[0].id;

  const createResp = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  const folder = await createResp.json();
  return folder.id;
}

async function setFolderPublicReadable(accessToken: string, folderId: string) {
  // Create a permission: anyone with the link can view
  await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone",
    }),
  });
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buffer;
}
