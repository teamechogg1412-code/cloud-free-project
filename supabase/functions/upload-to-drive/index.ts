import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UploadRequest {
  tenantId: string;
  fileName: string;
  fileContent: string; // base64 encoded
  mimeType: string;
  subfolder?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { tenantId, fileName, fileContent, mimeType, subfolder }: UploadRequest = await req.json();

    if (!tenantId || !fileName || !fileContent || !mimeType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tenantId, fileName, fileContent, mimeType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation: file size limit (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const decodedSize = Math.ceil(fileContent.length * 0.75);
    if (decodedSize > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `파일 크기가 너무 큽니다. 최대 10MB까지 허용됩니다.` }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MIME type whitelist
    const ALLOWED_MIME_TYPES = [
      "application/pdf",
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint",
      "text/plain", "text/csv",
      "application/json",
      "video/mp4", "video/quicktime",
      "audio/mpeg", "audio/wav",
    ];
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return new Response(
        JSON.stringify({ error: `허용되지 않는 파일 형식입니다: ${mimeType}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filename sanitization
    const sanitizedFileName = fileName
      .replace(/\.\.\//g, "")
      .replace(/[^a-zA-Z0-9가-힣._\-\s]/g, "_")
      .substring(0, 255);

    // Subfolder sanitization
    const sanitizedSubfolder = subfolder
      ? subfolder.replace(/\.\.\//g, "").replace(/[^a-zA-Z0-9가-힣._\-\s/]/g, "_").substring(0, 100)
      : undefined;

    // Check user is member of tenant
    const { data: membership, error: membershipError } = await supabase
      .from("tenant_memberships")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: "Not a member of this tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant's Google credentials and drive owner email
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("google_credentials, drive_folder_id, name, drive_connected_by")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tenant.google_credentials || !tenant.drive_folder_id) {
      return new Response(
        JSON.stringify({ error: "Google Drive not configured for this tenant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get drive owner email for impersonation
    let driveOwnerEmail: string | null = null;
    if (tenant.drive_connected_by) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", tenant.drive_connected_by)
        .single();
      driveOwnerEmail = ownerProfile?.email || null;
    }

    // Decode credentials (base64 -> JSON)
    const credentialsJson = atob(tenant.google_credentials);
    const credentials = JSON.parse(credentialsJson);

    // Get Google access token using service account with impersonation
    const accessToken = await getGoogleAccessToken(credentials, driveOwnerEmail);

    // Determine target folder (create subfolder if needed)
    let targetFolderId = tenant.drive_folder_id;
    if (sanitizedSubfolder) {
      targetFolderId = await getOrCreateSubfolder(accessToken, tenant.drive_folder_id, sanitizedSubfolder);
    }

    // Upload file to Google Drive
    const driveResult = await uploadToGoogleDrive(
      accessToken,
      targetFolderId,
      sanitizedFileName,
      fileContent,
      mimeType
    );

    return new Response(
      JSON.stringify({
        success: true,
        fileId: driveResult.id,
        fileName: driveResult.name,
        webViewLink: driveResult.webViewLink,
        webContentLink: driveResult.webContentLink,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Upload error:", err);
    const errorMessage = err instanceof Error ? err.message : "Upload failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Get Google OAuth2 access token using service account with impersonation
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

  // Add impersonation subject if available
  if (impersonateEmail) {
    payload.sub = impersonateEmail;
  }

  // Create JWT
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with private key
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

  // Exchange JWT for access token
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
    throw new Error("Failed to get Google access token");
  }

  return tokenData.access_token;
}

// Upload file to Google Drive
async function uploadToGoogleDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  fileContent: string,
  mimeType: string
): Promise<{ id: string; name: string; webViewLink: string; webContentLink: string }> {
  // Decode base64 content to binary
  const binaryString = atob(fileContent);
  const binaryContent = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    binaryContent[i] = binaryString.charCodeAt(i);
  }

  const boundary = "---MultipartBoundary" + Date.now();
  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
  });

  // Build multipart body properly: metadata part (text) + file part (binary)
  const encoder = new TextEncoder();
  const metadataPart = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`
  );
  const filePreamble = encoder.encode(
    `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const closing = encoder.encode(`\r\n--${boundary}--`);

  // Concatenate all parts into a single Uint8Array
  const body = new Uint8Array(metadataPart.length + filePreamble.length + binaryContent.length + closing.length);
  let offset = 0;
  body.set(metadataPart, offset); offset += metadataPart.length;
  body.set(filePreamble, offset); offset += filePreamble.length;
  body.set(binaryContent, offset); offset += binaryContent.length;
  body.set(closing, offset);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: body,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Drive upload failed: ${error}`);
  }

  return response.json();
}

// Get or create subfolder
async function getOrCreateSubfolder(
  accessToken: string,
  parentId: string,
  folderName: string
): Promise<string> {
  // Search for existing folder
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const searchResult = await searchResponse.json();
  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }

  // Create new folder
  const createResponse = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });

  const folder = await createResponse.json();
  return folder.id;
}

// Helper functions
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
