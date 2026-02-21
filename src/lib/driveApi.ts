import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface UploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  webContentLink?: string;
  error?: string;
}

interface BackupResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  backupTimestamp?: string;
  recordCounts?: {
    tenant: number;
    memberships: number;
    invoices: number;
    attachments: number;
  };
  error?: string;
}

/**
 * Upload a file to the tenant's Google Drive
 */
export async function uploadFileToDrive(
  tenantId: string,
  file: File,
  subfolder?: string
): Promise<UploadResult> {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    // Convert file to base64
    const fileContent = await fileToBase64(file);

    // Call edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-to-drive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        tenantId,
        fileName: file.name,
        fileContent,
        mimeType: file.type || "application/octet-stream",
        subfolder,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || "Upload failed" };
    }

    return result;
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Upload failed" };
  }
}

/**
 * Create a backup of all tenant data to Google Drive
 */
export async function createDriveBackup(tenantId: string): Promise<BackupResult> {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    // Call edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/backup-to-drive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ tenantId }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || "Backup failed" };
    }

    return result;
  } catch (error) {
    console.error("Backup error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Backup failed" };
  }
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
