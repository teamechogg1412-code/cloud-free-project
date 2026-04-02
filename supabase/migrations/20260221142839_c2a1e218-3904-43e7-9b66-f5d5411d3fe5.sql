
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can read system default leave_groups" ON public.leave_groups;
DROP POLICY IF EXISTS "Authenticated users full access leave_groups" ON public.leave_groups;
DROP POLICY IF EXISTS "Anyone can read system default leave_types" ON public.leave_types;
DROP POLICY IF EXISTS "Authenticated users full access leave_types" ON public.leave_types;

-- Create PERMISSIVE policies
CREATE POLICY "Anyone can read system default leave_groups"
  ON public.leave_groups FOR SELECT
  USING (tenant_id IS NULL);

CREATE POLICY "Authenticated users full access leave_groups"
  ON public.leave_groups FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can read system default leave_types"
  ON public.leave_types FOR SELECT
  USING (tenant_id IS NULL);

CREATE POLICY "Authenticated users full access leave_types"
  ON public.leave_types FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
