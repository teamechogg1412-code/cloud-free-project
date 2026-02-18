-- Allow company admins to update their own tenant's Google Drive settings
DROP POLICY IF EXISTS "Super admins can update tenants" ON public.tenants;

CREATE POLICY "Admins can update tenants"
ON public.tenants
FOR UPDATE
USING (is_sys_super_admin() OR is_tenant_admin(id));