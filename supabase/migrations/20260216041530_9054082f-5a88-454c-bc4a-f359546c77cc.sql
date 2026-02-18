
-- 직원 온보딩 상세 정보 테이블
CREATE TABLE public.employee_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  hire_date DATE,
  resignation_date DATE,
  resident_number TEXT,
  is_foreigner TEXT DEFAULT '내국인',
  nationality TEXT DEFAULT '대한민국',
  address TEXT,
  phone_mobile TEXT,
  phone_tel TEXT,
  email TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  id_card_url TEXT,
  bankbook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- RLS 활성화
ALTER TABLE public.employee_details ENABLE ROW LEVEL SECURITY;

-- 본인 또는 테넌트 관리자가 조회 가능
CREATE POLICY "Users can view own details"
  ON public.employee_details FOR SELECT
  USING (user_id = auth.uid() OR is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- 본인이 등록 가능
CREATE POLICY "Users can insert own details"
  ON public.employee_details FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_tenant_member(tenant_id));

-- 본인 또는 관리자가 수정 가능
CREATE POLICY "Users can update own details"
  ON public.employee_details FOR UPDATE
  USING (user_id = auth.uid() OR is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- 관리자만 삭제 가능
CREATE POLICY "Admins can delete details"
  ON public.employee_details FOR DELETE
  USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- 파트너사 HR 스코프로 열람 가능
CREATE POLICY "Partners with hr scope can view"
  ON public.employee_details FOR SELECT
  USING (user_has_partner_hr_scope(tenant_id));

-- 타임스탬프 트리거
CREATE TRIGGER update_employee_details_updated_at
  BEFORE UPDATE ON public.employee_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
