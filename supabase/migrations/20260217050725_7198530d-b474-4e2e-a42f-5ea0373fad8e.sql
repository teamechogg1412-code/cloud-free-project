-- Update RLS policies for leave_groups to allow reading system defaults (tenant_id IS NULL)
DROP POLICY IF EXISTS "Tenant members can view leave_groups" ON public.leave_groups;
CREATE POLICY "Tenant members can view leave_groups" ON public.leave_groups
  FOR SELECT USING (
    tenant_id IS NULL  -- system defaults readable by all authenticated users
    OR is_tenant_member(tenant_id)
    OR is_sys_super_admin()
  );

-- Super admins can manage system defaults (tenant_id IS NULL)
DROP POLICY IF EXISTS "Tenant admins can manage leave_groups" ON public.leave_groups;
CREATE POLICY "Tenant admins can manage leave_groups" ON public.leave_groups
  FOR ALL USING (
    (tenant_id IS NULL AND is_sys_super_admin())
    OR is_tenant_admin(tenant_id)
    OR is_sys_super_admin()
  );

-- Same for leave_types
DROP POLICY IF EXISTS "Tenant members can view leave_types" ON public.leave_types;
CREATE POLICY "Tenant members can view leave_types" ON public.leave_types
  FOR SELECT USING (
    tenant_id IS NULL
    OR is_tenant_member(tenant_id)
    OR is_sys_super_admin()
  );

DROP POLICY IF EXISTS "Tenant admins can manage leave_types" ON public.leave_types;
CREATE POLICY "Tenant admins can manage leave_types" ON public.leave_types
  FOR ALL USING (
    (tenant_id IS NULL AND is_sys_super_admin())
    OR is_tenant_admin(tenant_id)
    OR is_sys_super_admin()
  );