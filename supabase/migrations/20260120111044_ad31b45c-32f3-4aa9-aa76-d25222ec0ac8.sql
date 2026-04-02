-- 직원 초대 테이블
CREATE TABLE public.employee_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('company_admin', 'manager', 'employee')),
  department TEXT,
  job_title TEXT,
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email, status)
);

-- RLS 활성화
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;

-- 회사 관리자는 자기 회사의 초대를 관리할 수 있음
CREATE POLICY "Tenant admins can view invitations"
  ON public.employee_invitations FOR SELECT
  USING (public.is_tenant_admin(tenant_id) OR public.is_sys_super_admin());

CREATE POLICY "Tenant admins can create invitations"
  ON public.employee_invitations FOR INSERT
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_sys_super_admin());

CREATE POLICY "Tenant admins can update invitations"
  ON public.employee_invitations FOR UPDATE
  USING (public.is_tenant_admin(tenant_id) OR public.is_sys_super_admin());

CREATE POLICY "Tenant admins can delete invitations"
  ON public.employee_invitations FOR DELETE
  USING (public.is_tenant_admin(tenant_id) OR public.is_sys_super_admin());

-- 초대받은 사람도 본인의 초대를 볼 수 있음 (이메일 기반)
CREATE POLICY "Users can view their own invitations"
  ON public.employee_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
  );

-- 업데이트 트리거
CREATE TRIGGER update_employee_invitations_updated_at
  BEFORE UPDATE ON public.employee_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();