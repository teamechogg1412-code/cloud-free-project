import { supabase as supabaseClient } from "@/integrations/supabase/client";

// Re-export with 'any' cast to bypass empty auto-generated type definitions.
// The actual tables exist in the connected external Supabase project.
export const supabase = supabaseClient as any;
