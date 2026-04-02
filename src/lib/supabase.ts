import { createClient } from '@supabase/supabase-js';

// External Supabase project - directly configured to bypass auto-managed .env
const EXTERNAL_SUPABASE_URL = "https://matcnptzugnaisuhowbk.supabase.co";
const EXTERNAL_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hdGNucHR6dWduYWlzdWhvd2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTU3MDEsImV4cCI6MjA4Njk5MTcwMX0.M4jrLYUrbFgGaKWTda1e1iLAfdMcU8oZSxsTC65DBnA";

export const supabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
}) as any;
