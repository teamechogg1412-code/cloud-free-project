import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tenantId, folderKey, dateRange } = await req.json();

    if (!tenantId || !folderKey) {
      return new Response(JSON.stringify({ error: "Missing tenantId or folderKey" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a member" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get folder mapping
    const { data: mapping } = await supabase
      .from("drive_folder_mappings")
      .select("folder_id")
      .eq("tenant_id", tenantId)
      .eq("folder_key", folderKey)
      .eq("is_active", true)
      .single();

    if (!mapping) {
      return new Response(JSON.stringify({ error: "Folder mapping not found", files: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tenant Google credentials
    const { data: tenant } = await supabase
      .from("tenants")
      .select("google_credentials, drive_connected_by")
      .eq("id", tenantId)
      .single();

    if (!tenant?.google_credentials) {
      return new Response(JSON.stringify({ error: "Google Drive not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let driveOwnerEmail: string | null = null;
    if (tenant.drive_connected_by) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", tenant.drive_connected_by)
        .single();
      driveOwnerEmail = ownerProfile?.email || null;
    }

    const credentials = JSON.parse(atob(tenant.google_credentials));
    const accessToken = await getGoogleAccessToken(credentials, driveOwnerEmail);

    // List CSV files in folder
    let query = `'${mapping.folder_id}' in parents and mimeType='text/csv' and trashed=false`;

    // Optional date filtering by filename pattern
    if (dateRange?.startDate) {
      // Files are named like bank_0004_08660104141706_20260216.csv
      // We'll fetch all and filter client-side for simplicity
    }

    const listResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=name desc&pageSize=100&fields=files(id,name,modifiedTime,size)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const listResult = await listResponse.json();
    const files = listResult.files || [];

    // Filter by date range if specified
    let filteredFiles = files;
    if (dateRange?.startDate && dateRange?.endDate) {
      filteredFiles = files.filter((f: any) => {
        const match = f.name.match(/_(\d{8})\.csv$/);
        if (!match) return true;
        const fileDate = match[1];
        return fileDate >= dateRange.startDate.replace(/-/g, "") && fileDate <= dateRange.endDate.replace(/-/g, "");
      });
    }

    // Read and parse CSV files (limit to 30 most recent)
    const recentFiles = filteredFiles.slice(0, 30);
    const allRows: any[] = [];

    for (const file of recentFiles) {
      try {
        const contentResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const csvText = await contentResponse.text();
        const rows = parseCsv(csvText, file.name);
        allRows.push(...rows);
      } catch (e: any) {
        console.error(`Error reading file ${file.name}:`, e.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      files: recentFiles.map((f: any) => ({ name: f.name, modifiedTime: f.modifiedTime })),
      data: allRows,
      totalFiles: filteredFiles.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Read drive CSV error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseCsv(csvText: string, fileName: string): any[] {
  // Remove BOM
  const text = csvText.replace(/^\uFEFF/, "");
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",");
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = { _fileName: fileName };
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ─── Google Auth (same as other functions) ───

async function getGoogleAccessToken(credentials: any, impersonateEmail: string | null): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  if (impersonateEmail) payload.sub = impersonateEmail;

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

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(signatureInput));
  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${signatureInput}.${encodedSignature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) throw new Error("Google access token 발급 실패");
  return tokenData.access_token;
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
