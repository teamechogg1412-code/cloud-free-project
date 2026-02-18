
-- Create a helper function to check if user has partner HR scope to a tenant
CREATE OR REPLACE FUNCTION public.user_has_partner_hr_scope(_target_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships tm
    JOIN public.tenant_partnerships tp ON (
      (tp.requester_tenant_id = tm.tenant_id AND tp.target_tenant_id = _target_tenant_id)
      OR (tp.target_tenant_id = tm.tenant_id AND tp.requester_tenant_id = _target_tenant_id)
    )
    WHERE tm.user_id = auth.uid()
    AND tp.status = 'active'
    AND 'hr' = ANY(tp.data_scopes)
  )
$$;

-- Replace the tenant_memberships SELECT policy to avoid any self-reference
DROP POLICY IF EXISTS "Members and partners can view tenant memberships" ON public.tenant_memberships;

CREATE POLICY "Members and partners can view tenant memberships"
ON public.tenant_memberships
FOR SELECT
USING (
  is_tenant_member(tenant_id)
  OR is_sys_super_admin()
  OR user_has_partner_hr_scope(tenant_id)
);
