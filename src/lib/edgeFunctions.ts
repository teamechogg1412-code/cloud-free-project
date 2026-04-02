import { supabase } from "@/lib/supabase";

// Edge Functions are deployed to Lovable Cloud project, not the external Supabase.
// We must call them using the Lovable Cloud project URL directly.
const LOVABLE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || "matcnptzugnaisuhowbk";
const EDGE_FUNCTION_BASE = `https://${LOVABLE_PROJECT_ID}.supabase.co/functions/v1`;

interface InvokeOptions {
  body?: any;
  method?: string;
}

interface InvokeResult<T = any> {
  data: T | null;
  error: Error | null;
}

export async function invokeEdgeFunction<T = any>(
  functionName: string,
  options: InvokeOptions = {}
): Promise<InvokeResult<T>> {
  try {
    // Get current session token from the external Supabase for auth
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4d2ZhdGVmc2lscGphc3J3Y2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODYwMjMsImV4cCI6MjA4NzE2MjAyM30.Sbwo1peP3j5JTA5BfsmWYM-Gt3PUuo8-3t9ikvYwxWg",
    };

    // Pass the external Supabase auth token if available
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const url = `${EDGE_FUNCTION_BASE}/${functionName}`;
    const fetchOptions: RequestInit = {
      method: options.method === "GET" ? "GET" : "POST",
      headers,
    };

    if (options.body && fetchOptions.method !== "GET") {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: new Error(data?.error || `Edge function error: ${response.status}`) };
    }

    return { data: data as T, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}
