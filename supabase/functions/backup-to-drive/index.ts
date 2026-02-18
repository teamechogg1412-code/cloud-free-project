import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BackupRequest {
  tenantId: string;
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
    const { tenantId }: BackupRequest = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: tenantId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user is admin of tenant
    const { data: membership, error: membershipError } = await supabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership || membership.role !== "company_admin") {
      return new Response(
        JSON.stringify({ error: "Only company admins can create backups" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant's Google credentials
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("*")
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

    // Collect all tenant data
    const backupData = await collectTenantData(supabase, tenantId);

    // Decode credentials (base64 -> JSON)
    const credentialsJson = atob(tenant.google_credentials);
    const credentials = JSON.parse(credentialsJson);

    // Get Google access token
    const accessToken = await getGoogleAccessToken(credentials);

    // Create backup folder
    const backupFolderId = await getOrCreateSubfolder(accessToken, tenant.drive_folder_id, "Backups");

    // Generate backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup_${tenant.name}_${timestamp}.json`;
    const fileContent = btoa(unescape(encodeURIComponent(JSON.stringify(backupData, null, 2))));

    // Upload to Google Drive
    const driveResult = await uploadToGoogleDrive(
      accessToken,
      backupFolderId,
      fileName,
      fileContent,
      "application/json"
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Backup created successfully",
        fileId: driveResult.id,
        fileName: driveResult.name,
        webViewLink: driveResult.webViewLink,
        backupTimestamp: new Date().toISOString(),
        recordCounts: {
          tenant: 1,
          memberships: backupData.memberships.length,
          invoices: backupData.invoices.length,
          attachments: backupData.attachments.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Backup error:", err);
    const errorMessage = err instanceof Error ? err.message : "Backup failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Collect all tenant-related data
// deno-lint-ignore no-explicit-any
async function collectTenantData(supabase: any, tenantId: string) {
  // Get memberships with profile data
  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select(`
      id,
      role,
      department,
      job_title,
      created_at,
      user_id,
      profiles:user_id (
        email,
        full_name,
        phone
      )
    `)
    .eq("tenant_id", tenantId);

  // Get invoices
  const { data: invoices } = await supabase
    .from("vendor_invoices")
    .select("*")
    .eq("tenant_id", tenantId);

  // Get attachments for invoices
  // deno-lint-ignore no-explicit-any
  const invoiceIds = invoices?.map((i: any) => i.id) || [];
  const { data: attachments } = await supabase
    .from("invoice_attachments")
    .select("*")
    .in("invoice_id", invoiceIds.length > 0 ? invoiceIds : ["none"]);

  return {
    backupVersion: "1.0",
    createdAt: new Date().toISOString(),
    tenantId,
    memberships: memberships || [],
    invoices: invoices || [],
    attachments: attachments || [],
  };
}

// Get Google OAuth2 access token using service account
async function getGoogleAccessToken(credentials: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
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
): Promise<{ id: string; name: string; webViewLink: string }> {
  const binaryContent = Uint8Array.from(atob(fileContent), (c) => c.charCodeAt(0));

  const boundary = "---MultipartBoundary" + Date.now();
  const metadata = { name: fileName, parents: [folderId] };
  const metadataPart = JSON.stringify(metadata);

  const multipartBody = new Uint8Array([
    ...new TextEncoder().encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataPart}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`
    ),
    ...binaryContent,
    ...new TextEncoder().encode(`\r\n--${boundary}--`),
  ]);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
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
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const searchResult = await searchResponse.json();
  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }

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
