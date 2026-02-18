import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOKEN_URL = "https://oauth.codef.io/oauth/token";
const BASE_URL = "https://development.codef.io";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const results: any[] = [];

  try {
    // 1. Get all tenants with Drive configured and finance accounts
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name, google_credentials, drive_folder_id, drive_connected_by");

    if (!tenants || tenants.length === 0) {
      return new Response(JSON.stringify({ message: "No tenants found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const tenant of tenants) {
      if (!tenant.google_credentials || !tenant.drive_folder_id) continue;

      try {
        // 2. Check if tenant has bank_transactions folder mapping
        const { data: mappings } = await supabase
          .from("drive_folder_mappings")
          .select("*")
          .eq("tenant_id", tenant.id)
          .eq("is_active", true)
          .in("folder_key", ["bank_transactions", "card_transactions"]);

        if (!mappings || mappings.length === 0) continue;

        // 3. Get CODEF configs
        const { data: configs } = await supabase
          .from("tenant_api_configs")
          .select("config_key, config_value")
          .eq("tenant_id", tenant.id)
          .in("config_key", ["CODEF_CLIENT_ID", "CODEF_CLIENT_SECRET"]);

        const configMap: Record<string, string> = {};
        (configs || []).forEach((c: any) => { configMap[c.config_key] = c.config_value; });

        if (!configMap["CODEF_CLIENT_ID"] || !configMap["CODEF_CLIENT_SECRET"]) continue;

        const token = await getCodefToken(configMap["CODEF_CLIENT_ID"], configMap["CODEF_CLIENT_SECRET"]);

        // 4. Get finance accounts
        const { data: accounts } = await supabase
          .from("finance_accounts")
          .select("*")
          .eq("tenant_id", tenant.id)
          .eq("is_active", true);

        if (!accounts || accounts.length === 0) continue;

        // Get connected ID map
        const { data: connConfigs } = await supabase
          .from("tenant_api_configs")
          .select("config_key, config_value")
          .eq("tenant_id", tenant.id)
          .eq("category", "finance_connected");

        const connMap: Record<string, string> = {};
        (connConfigs || []).forEach((c: any) => { connMap[c.config_key] = c.config_value; });

        // Get Drive access token
        const credentialsJson = atob(tenant.google_credentials);
        const credentials = JSON.parse(credentialsJson);

        let driveOwnerEmail: string | null = null;
        if (tenant.drive_connected_by) {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", tenant.drive_connected_by)
            .single();
          driveOwnerEmail = ownerProfile?.email || null;
        }

        const driveToken = await getGoogleAccessToken(credentials, driveOwnerEmail);

        // Yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = formatDate(yesterday);

        // 5. Process bank accounts
        const bankMapping = mappings.find(m => m.folder_key === "bank_transactions");
        const cardMapping = mappings.find(m => m.folder_key === "card_transactions");

        const bankAccounts = accounts.filter(a => a.business_type === "BK");
        const cardAccounts = accounts.filter(a => a.business_type === "CD");

        // Bank transactions
        if (bankMapping && bankAccounts.length > 0) {
          for (const acc of bankAccounts) {
            const connectedId = connMap[acc.connected_id_key];
            if (!connectedId) continue;

            try {
              const txData = await fetchCodefTransactions(token, {
                organization: acc.organization,
                connectedId,
                account: acc.account_number || "",
                startDate: dateStr,
                endDate: dateStr,
                orderBy: "0",
              }, "/v1/kr/bank/b/account/transaction-list");

              if (txData && txData.resTrHistoryList) {
                const csv = bankTransactionsToCsv(txData, acc);
                const fileName = `bank_${acc.organization}_${acc.account_number || "all"}_${dateStr}.csv`;
                await uploadCsvToDrive(driveToken, bankMapping.folder_id, fileName, csv);
                results.push({ tenant: tenant.name, type: "bank", account: acc.account_number, records: txData.resTrHistoryList.length });
              }
            } catch (e: any) {
              console.error(`Bank sync error for ${acc.account_number}:`, e.message);
              results.push({ tenant: tenant.name, type: "bank", account: acc.account_number, error: e.message });
            }
          }
        }

        // Card transactions
        if (cardMapping && cardAccounts.length > 0) {
          for (const acc of cardAccounts) {
            const connectedId = connMap[acc.connected_id_key];
            if (!connectedId) continue;

            try {
              const txData = await fetchCodefTransactions(token, {
                organization: acc.organization,
                connectedId,
                cardNo: acc.account_number || "",
                startDate: dateStr,
                endDate: dateStr,
                orderBy: "0",
              }, "/v1/kr/card/b/account/transaction-list");

              if (txData) {
                const list = txData.resTrHistoryList || txData.resCardHistoryList || [];
                if (list.length > 0) {
                  const csv = cardTransactionsToCsv(list, acc);
                  const fileName = `card_${acc.organization}_${acc.account_number || "all"}_${dateStr}.csv`;
                  await uploadCsvToDrive(driveToken, cardMapping.folder_id, fileName, csv);
                  results.push({ tenant: tenant.name, type: "card", account: acc.account_number, records: list.length });
                }
              }
            } catch (e: any) {
              console.error(`Card sync error for ${acc.account_number}:`, e.message);
              results.push({ tenant: tenant.name, type: "card", account: acc.account_number, error: e.message });
            }
          }
        }

      } catch (tenantError: any) {
        console.error(`Tenant ${tenant.name} sync error:`, tenantError.message);
        results.push({ tenant: tenant.name, error: tenantError.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Helper Functions ───

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function getCodefToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=read",
  });
  const data = await response.json();
  if (!data.access_token) throw new Error("CODEF 토큰 발급 실패");
  return data.access_token;
}

async function fetchCodefTransactions(
  token: string,
  params: Record<string, any>,
  endpoint: string
): Promise<any> {
  const response = await fetch(BASE_URL + endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const raw = await response.text();
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch (_) {}
  const parsed = JSON.parse(decoded);

  if (parsed?.result?.code !== "CF-00000") {
    throw new Error(`CODEF 조회 실패: ${parsed?.result?.message || "unknown"}`);
  }

  return parsed.data;
}

function bankTransactionsToCsv(data: any, account: any): string {
  const header = "거래일,거래시간,입금,출금,거래후잔액,적요1,적요2,적요3,적요4,계좌번호,계좌명,예금주";
  const rows = (data.resTrHistoryList || []).map((t: any) =>
    [
      t.resAccountTrDate || "",
      t.resAccountTrTime || "",
      t.resAccountIn || "0",
      t.resAccountOut || "0",
      t.resAfterTranBalance || "0",
      csvEscape(t.resAccountDesc1 || ""),
      csvEscape(t.resAccountDesc2 || ""),
      csvEscape(t.resAccountDesc3 || ""),
      csvEscape(t.resAccountDesc4 || ""),
      data.resAccount || account.account_number || "",
      csvEscape(data.resAccountName || ""),
      csvEscape(data.resAccountHolder || ""),
    ].join(",")
  );
  return "\uFEFF" + header + "\n" + rows.join("\n");
}

function cardTransactionsToCsv(list: any[], account: any): string {
  const header = "거래일,거래시간,가맹점,금액,통화,카드번호,승인번호,할부,상태";
  const rows = list.map((t: any) =>
    [
      t.resUsedDate || t.resTranDate || "",
      t.resUsedTime || t.resTranTime || "",
      csvEscape(t.resStoreName || t.resMerchantName || ""),
      t.resUsedAmount || t.resTranAmount || "0",
      t.resCurrency || "KRW",
      t.resCardNo || account.account_number || "",
      t.resApprovalNo || "",
      t.resInstallmentCount || "일시불",
      t.resStatus || "",
    ].join(",")
  );
  return "\uFEFF" + header + "\n" + rows.join("\n");
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

async function getGoogleAccessToken(credentials: any, impersonateEmail: string | null): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/drive",
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
  if (!tokenData.access_token) throw new Error("Google Drive 토큰 발급 실패");
  return tokenData.access_token;
}

async function uploadCsvToDrive(accessToken: string, folderId: string, fileName: string, csvContent: string) {
  // Check if file already exists and update, or create new
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(fileName)}' and '${folderId}' in parents and trashed=false`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchResult = await searchResponse.json();

  const csvBytes = new TextEncoder().encode(csvContent);

  if (searchResult.files && searchResult.files.length > 0) {
    // Update existing file
    const fileId = searchResult.files[0].id;
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "text/csv",
        },
        body: csvBytes,
      }
    );
    if (!response.ok) throw new Error(`Drive 업데이트 실패: ${await response.text()}`);
  } else {
    // Create new file
    const boundary = "---Boundary" + Date.now();
    const metadata = JSON.stringify({ name: fileName, parents: [folderId], mimeType: "text/csv" });
    const encoder = new TextEncoder();

    const metaPart = encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`);
    const filePreamble = encoder.encode(`--${boundary}\r\nContent-Type: text/csv\r\n\r\n`);
    const closing = encoder.encode(`\r\n--${boundary}--`);

    const body = new Uint8Array(metaPart.length + filePreamble.length + csvBytes.length + closing.length);
    let offset = 0;
    body.set(metaPart, offset); offset += metaPart.length;
    body.set(filePreamble, offset); offset += filePreamble.length;
    body.set(csvBytes, offset); offset += csvBytes.length;
    body.set(closing, offset);

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );
    if (!response.ok) throw new Error(`Drive 업로드 실패: ${await response.text()}`);
  }
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
