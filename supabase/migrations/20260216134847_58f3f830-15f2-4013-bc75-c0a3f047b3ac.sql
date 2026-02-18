
-- 근로규칙 테이블 (tenant_id가 NULL이면 시스템 기본값)
CREATE TABLE public.work_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  -- 소정근로요일
  work_days text[] NOT NULL DEFAULT '{월,화,수,목,금}',
  -- 소정근로규칙
  standard_work_unit text NOT NULL DEFAULT '1주',
  standard_work_hours numeric NOT NULL DEFAULT 40,
  overtime_min_unit text NOT NULL DEFAULT '1주',
  overtime_min_hours numeric NOT NULL DEFAULT 0,
  overtime_max_unit text NOT NULL DEFAULT '1주',
  overtime_max_hours numeric NOT NULL DEFAULT 12,
  standard_period text NOT NULL DEFAULT '1주',
  standard_period_start_day integer DEFAULT 1,
  standard_include_holidays boolean NOT NULL DEFAULT false,
  -- 최대근로규칙
  max_work_unit text NOT NULL DEFAULT '1주',
  max_work_hours numeric NOT NULL DEFAULT 52,
  max_period text NOT NULL DEFAULT '1주',
  max_period_start_day integer DEFAULT 1,
  max_include_holidays boolean NOT NULL DEFAULT false,
  -- 메타
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.work_rules ENABLE ROW LEVEL SECURITY;

-- 슈퍼어드민: 시스템 기본 규칙(tenant_id IS NULL) 전체 관리
CREATE POLICY "Super admins can manage system work rules"
ON public.work_rules FOR ALL
USING (is_sys_super_admin());

-- 테넌트 관리자: 자기 테넌트 규칙 관리
CREATE POLICY "Tenant admins can manage tenant work rules"
ON public.work_rules FOR ALL
USING (tenant_id IS NOT NULL AND (is_tenant_admin(tenant_id) OR is_sys_super_admin()));

-- 테넌트 멤버: 자기 테넌트 규칙 조회
CREATE POLICY "Tenant members can view work rules"
ON public.work_rules FOR SELECT
USING (tenant_id IS NOT NULL AND is_tenant_member(tenant_id));

-- 모든 인증 사용자: 시스템 기본값 조회
CREATE POLICY "Authenticated users can view system defaults"
ON public.work_rules FOR SELECT
USING (tenant_id IS NULL AND auth.uid() IS NOT NULL);

-- updated_at 트리거
CREATE TRIGGER update_work_rules_updated_at
BEFORE UPDATE ON public.work_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
