import { createClient } from '@supabase/supabase-js';

// External Supabase project - directly configured to bypass auto-managed .env
const EXTERNAL_SUPABASE_URL = "https://matcnptzugnaisuhowbk.supabase.co";
const EXTERNAL_SUPABASE_KEY = "sb_publishable_nLy7XdGa-odfm4xyvFq2Fw_XPCiA2Bj";

export const supabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
}) as any;
