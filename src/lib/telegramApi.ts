import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface TelegramResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Send a file to tenant's Telegram bot for backup
 */
export async function sendFileToTelegram(
  tenantId: string,
  file: File,
  caption?: string
): Promise<TelegramResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    const fileContent = await fileToBase64(file);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-to-telegram`, {
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
        caption,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result.error || "Failed to send" };
    }
    return result;
  } catch (error) {
    console.error("Telegram send error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Send failed" };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
