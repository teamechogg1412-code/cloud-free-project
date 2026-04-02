
-- 1. 휴가 그룹 (연차, 보상휴가 등 그룹)
CREATE TABLE public.leave_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  overdraft_limit numeric DEFAULT NULL, -- NULL=제한없음, 0=초과불가, N=N일까지 마이너스 허용
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage leave_groups" ON public.leave_groups
  FOR ALL USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

CREATE POLICY "Tenant members can view leave_groups" ON public.leave_groups
  FOR SELECT USING (is_tenant_member(tenant_id) OR is_sys_super_admin());

-- 2. 휴가 유형 (연차, 반차, 병가, 출산휴가 등)
CREATE TABLE public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.leave_groups(id) ON DELETE SET NULL,
  name text NOT NULL,
  display_name text, -- 다른 직원에게 보이는 이름
  time_option text NOT NULL DEFAULT 'full_day', -- 'full_day' | 'time_input'
  paid_hours numeric DEFAULT 8, -- 유급시간
  deduction_days numeric DEFAULT 1, -- 차감 일수
  special_option text DEFAULT 'none', -- 'none' | 'long_term' | 'day_off' | 'holiday'
  min_consecutive_days integer DEFAULT 1,
  max_consecutive_days integer,
  include_holidays_in_consecutive boolean DEFAULT false,
  is_paid boolean DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage leave_types" ON public.leave_types
  FOR ALL USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

CREATE POLICY "Tenant members can view leave_types" ON public.leave_types
  FOR SELECT USING (is_tenant_member(tenant_id) OR is_sys_super_admin());

-- 3. 휴가 잔여일수 (발생 건 단위)
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.leave_groups(id) ON DELETE SET NULL,
  total_days numeric NOT NULL DEFAULT 0, -- 총 발생일수
  used_days numeric NOT NULL DEFAULT 0, -- 사용일수
  generation_type text NOT NULL DEFAULT 'manual', -- 'manual' | 'auto_annual' | 'compensatory'
  memo text,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date, -- NULL=무제한
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage leave_balances" ON public.leave_balances
  FOR ALL USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

CREATE POLICY "Users can view own leave_balances" ON public.leave_balances
  FOR SELECT USING (user_id = auth.uid() OR is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- 4. 휴가 신청 (결재 워크플로우 포함)
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time, -- 시간 입력 휴가용
  end_time time,
  total_days numeric NOT NULL DEFAULT 1, -- 실제 차감일수
  reason text,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'cancelled'
  approved_by uuid,
  approved_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own leave_requests" ON public.leave_requests
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_tenant_member(tenant_id));

CREATE POLICY "Users can view own leave_requests" ON public.leave_requests
  FOR SELECT USING (user_id = auth.uid() OR is_tenant_admin(tenant_id) OR is_sys_super_admin());

CREATE POLICY "Users can update own pending requests" ON public.leave_requests
  FOR UPDATE USING (
    (user_id = auth.uid() AND status = 'pending') 
    OR is_tenant_admin(tenant_id) 
    OR is_sys_super_admin()
  );

CREATE POLICY "Admins can delete leave_requests" ON public.leave_requests
  FOR DELETE USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- 5. 한국 근로기준법 연차 자동계산 함수
CREATE OR REPLACE FUNCTION public.calculate_annual_leave_days(_hire_date date, _reference_date date DEFAULT CURRENT_DATE)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _months_worked integer;
  _years_worked integer;
  _total_days numeric := 0;
BEGIN
  IF _hire_date IS NULL OR _reference_date < _hire_date THEN
    RETURN 0;
  END IF;

  _months_worked := (EXTRACT(YEAR FROM age(_reference_date, _hire_date)) * 12 
                     + EXTRACT(MONTH FROM age(_reference_date, _hire_date)))::integer;
  _years_worked := EXTRACT(YEAR FROM age(_reference_date, _hire_date))::integer;

  IF _years_worked < 1 THEN
    -- 1년 미만: 1개월 개근 시 1일 (최대 11일)
    _total_days := LEAST(_months_worked, 11);
  ELSE
    -- 1년 이상: 15일 기본 + 2년마다 1일 추가 (최대 25일)
    _total_days := LEAST(15 + GREATEST(0, (_years_worked - 1) / 2), 25);
  END IF;

  RETURN _total_days;
END;
$$;

-- Triggers
CREATE TRIGGER update_leave_groups_updated_at BEFORE UPDATE ON public.leave_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON public.leave_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
