import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BackupRequest {
  tenantId: string;
  tables?: string[]; // optional: specific tables to backup
}

// 테넌트 관련 백업 대상 테이블 목록
const TENANT_TABLES = [
  "tenant_memberships",
  "departments",
  "positions",
  "shared_credentials",
  "credential_access",
  "credential_managers",
  "vendor_invoices",
  "invoice_attachments",
  "corporate_cards",
  "card_transactions",
  "finance_entries",
  "leave_groups",
  "leave_types",
  "leave_requests",
  "leave_balances",
  "attendance_records",
  "vehicles",
  "vehicle_logs",
  "projects",
  "artists",
  "artist_profiles",
  "schedules",
  "work_rules",
  "tenant_regulations",
  "employee_invitations",
  "admin_permissions",
  "keyword_alerts",
  "media_contacts",
  "audit_logs",
  "bank_presets",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tenantId, tables }: BackupRequest = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: tenantId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin permission
    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "company_admin") {
      // Check super admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("system_role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.system_role !== "sys_super_admin") {
        return new Response(
          JSON.stringify({ error: "Only admins can create backups" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get tenant info + Google credentials
    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (!tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tenant.google_credentials || !tenant.drive_folder_id) {
      return new Response(
        JSON.stringify({ error: "Google Drive not configured. Set google_credentials and drive_folder_id on the tenant." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Collect data from all tenant tables
    const targetTables = tables || TENANT_TABLES;
    const backupData: Record<string, unknown[]> = {};
    const recordCounts: Record<string, number> = {};
    const errors: string[] = [];

    // Also backup tenant info itself
    backupData["tenant_info"] = [tenant];
    recordCounts["tenant_info"] = 1;

    // Backup profile data for members
    const { data: memberProfiles } = await supabase
      .from("tenant_memberships")
      .select(`
        id, role, department, job_title, created_at, user_id,
        profiles:user_id ( id, email, full_name, phone, avatar_url )
      `)
      .eq("tenant_id", tenantId);

    backupData["member_profiles"] = memberProfiles || [];
    recordCounts["member_profiles"] = (memberProfiles || []).length;

    for (const tableName of targetTables) {
      if (tableName === "tenant_memberships") continue; // already fetched above

      try {
        // Try querying with tenant_id filter
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .eq("tenant_id", tenantId);

        if (error) {
          // Table might not exist or not have tenant_id — skip silently
          errors.push(`${tableName}: ${error.message}`);
          continue;
        }

        if (data && data.length > 0) {
          backupData[tableName] = data;
          recordCounts[tableName] = data.length;
        }
      } catch {
        // Skip tables that don't exist
      }
    }

    // For tables linked via credential_id (credential_access, credential_managers)
    if (backupData["shared_credentials"]) {
      const credIds = (backupData["shared_credentials"] as { id: string }[]).map(c => c.id);
      if (credIds.length > 0) {
        for (const linkedTable of ["credential_access", "credential_managers"]) {
          try {
            const { data } = await supabase
              .from(linkedTable)
              .select("*")
              .in("credential_id", credIds);
            if (data && data.length > 0) {
              backupData[linkedTable] = data;
              recordCounts[linkedTable] = data.length;
            }
          } catch {
            // skip
          }
        }
      }
    }

    // For invoice_attachments linked via invoice_id
    if (backupData["vendor_invoices"]) {
      const invoiceIds = (backupData["vendor_invoices"] as { id: string }[]).map(i => i.id);
      if (invoiceIds.length > 0) {
        try {
          const { data } = await supabase
            .from("invoice_attachments")
            .select("*")
            .in("invoice_id", invoiceIds);
          if (data && data.length > 0) {
            backupData["invoice_attachments"] = data;
            recordCounts["invoice_attachments"] = data.length;
          }
        } catch {
          // skip
        }
      }
    }

    // Prepare backup JSON
    const fullBackup = {
      backupVersion: "2.0",
      createdAt: new Date().toISOString(),
      tenantId,
      tenantName: tenant.name,
      totalTables: Object.keys(backupData).length,
      totalRecords: Object.values(recordCounts).reduce((a, b) => a + b, 0),
      recordCounts,
      data: backupData,
      ...(errors.length > 0 ? { skippedTables: errors } : {}),
    };

    // Get Google access token
    const credentialsJson = atob(tenant.google_credentials);
    const credentials = JSON.parse(credentialsJson);
    const accessToken = await getGoogleAccessToken(credentials);

    // Create backup folder
    const backupFolderId = await getOrCreateSubfolder(accessToken, tenant.drive_folder_id, "Backups");

    // Generate backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup_${tenant.name}_${timestamp}.json`;
    const fileContent = btoa(unescape(encodeURIComponent(JSON.stringify(fullBackup, null, 2))));

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
        totalTables: Object.keys(backupData).length,
        totalRecords: Object.values(recordCounts).reduce((a, b) => a + b, 0),
        recordCounts,
        ...(errors.length > 0 ? { skippedTables: errors.length } : {}),
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

// ── Google Auth & Drive helpers ──

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
