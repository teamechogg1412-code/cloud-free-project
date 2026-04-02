
-- Allow all tenant members to insert schedules (not just managers)
DROP POLICY IF EXISTS "Tenant managers can insert schedules" ON public.artist_schedules;
CREATE POLICY "Tenant members can insert schedules"
ON public.artist_schedules
FOR INSERT
WITH CHECK (is_tenant_member(tenant_id));

-- Allow all tenant members to update schedules
DROP POLICY IF EXISTS "Tenant managers can update schedules" ON public.artist_schedules;
CREATE POLICY "Tenant members can update schedules"
ON public.artist_schedules
FOR UPDATE
USING (is_tenant_member(tenant_id));

-- Allow all tenant members to delete schedules
DROP POLICY IF EXISTS "Tenant managers can delete schedules" ON public.artist_schedules;
CREATE POLICY "Tenant members can delete schedules"
ON public.artist_schedules
FOR DELETE
USING (is_tenant_member(tenant_id));
