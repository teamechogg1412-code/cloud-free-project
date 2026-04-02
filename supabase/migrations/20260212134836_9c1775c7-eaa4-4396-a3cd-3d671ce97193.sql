
-- 1. Fix tenant_memberships SELECT policy (self-referencing causes infinite recursion)
DROP POLICY IF EXISTS "Members and partners can view tenant memberships" ON public.tenant_memberships;

CREATE POLICY "Members and partners can view tenant memberships"
ON public.tenant_memberships
FOR SELECT
USING (
  is_tenant_member(tenant_id)
  OR is_sys_super_admin()
  OR has_partner_scope((SELECT tm.tenant_id FROM public.tenant_memberships tm WHERE tm.user_id = auth.uid() LIMIT 1), tenant_id, 'hr')
);

-- 2. Fix profiles SELECT policy (references tenant_memberships causing recursion through its policies)
DROP POLICY IF EXISTS "Tenant members can view tenant member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a SECURITY DEFINER function to check if two users share a tenant
CREATE OR REPLACE FUNCTION public.shares_tenant_with(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships tm1
    JOIN public.tenant_memberships tm2 ON tm1.tenant_id = tm2.tenant_id
    WHERE tm1.user_id = auth.uid()
    AND tm2.user_id = target_user_id
  )
$$;

CREATE POLICY "Users can view accessible profiles"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid()
  OR is_sys_super_admin()
  OR shares_tenant_with(id)
);
