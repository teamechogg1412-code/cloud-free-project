
-- 휴가 그룹 테이블
CREATE TABLE public.leave_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NULL,
  name TEXT NOT NULL,
  description TEXT,
  overdraft_limit INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 휴가 유형 테이블
CREATE TABLE public.leave_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NULL,
  group_id UUID REFERENCES public.leave_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  time_option TEXT NOT NULL DEFAULT 'full_day',
  paid_hours NUMERIC DEFAULT 8,
  deduction_days NUMERIC DEFAULT 1,
  special_option TEXT DEFAULT 'none',
  is_paid BOOLEAN DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  min_consecutive_days INT DEFAULT 1,
  max_consecutive_days INT,
  include_holidays_in_consecutive BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

-- RLS: 시스템 기본값(tenant_id IS NULL)은 누구나 읽기 가능
CREATE POLICY "Anyone can read system default leave_groups"
  ON public.leave_groups FOR SELECT
  USING (tenant_id IS NULL);

CREATE POLICY "Anyone can read system default leave_types"
  ON public.leave_types FOR SELECT
  USING (tenant_id IS NULL);

-- RLS: 인증된 사용자는 모든 작업 가능 (super admin용)
CREATE POLICY "Authenticated users full access leave_groups"
  ON public.leave_groups FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users full access leave_types"
  ON public.leave_types FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 기본 휴가 그룹 삽입 (tenant_id = NULL = 시스템 기본값)
INSERT INTO public.leave_groups (tenant_id, name, description, overdraft_limit, sort_order) VALUES
  (NULL, '연차휴가', '법정 연차에서 차감되는 휴가 그룹 (연차, 반차, 반반차 등)', NULL, 1),
  (NULL, '경조휴가', '경조사 발생 시 고정 일수 부여되는 휴가 그룹', 0, 2),
  (NULL, '출산·육아휴가', '출산/육아 관련 법정휴가 그룹', 0, 3),
  (NULL, '병가', '질병/부상 관련 휴가 그룹 (유급/무급)', NULL, 4),
  (NULL, '특별휴가', '회사 복지성 휴가 그룹 (생일, 리프레시 등)', 0, 5),
  (NULL, '무급휴가', '급여 미지급 휴가 그룹', 0, 6),
  (NULL, '대체휴무', '휴일/주말 근무 보상 대체휴무 그룹', NULL, 7);

-- 기본 휴가 유형 삽입
-- 연차휴가 그룹
INSERT INTO public.leave_types (tenant_id, group_id, name, display_name, time_option, paid_hours, deduction_days, special_option, is_paid, sort_order)
SELECT NULL, g.id, v.name, v.display_name, v.time_option, v.paid_hours, v.deduction_days, v.special_option, v.is_paid, v.sort_order
FROM public.leave_groups g
CROSS JOIN (VALUES
  ('연차', '연차', 'full_day', 8, 1, 'none', true, 1),
  ('반차', '반차', 'full_day', 4, 0.5, 'none', true, 2),
  ('반반차', '반반차', 'full_day', 2, 0.25, 'none', true, 3),
  ('시간차 연차', '시간연차', 'time_input', 1, 0.125, 'none', true, 4),
  ('대체연차', '대체연차', 'full_day', 8, 1, 'none', true, 5)
) AS v(name, display_name, time_option, paid_hours, deduction_days, special_option, is_paid, sort_order)
WHERE g.name = '연차휴가' AND g.tenant_id IS NULL;

-- 경조휴가 그룹
INSERT INTO public.leave_types (tenant_id, group_id, name, display_name, time_option, paid_hours, deduction_days, special_option, is_paid, sort_order)
SELECT NULL, g.id, v.name, v.display_name, v.time_option, v.paid_hours, v.deduction_days, v.special_option, v.is_paid, v.sort_order
FROM public.leave_groups g
CROSS JOIN (VALUES
  ('본인 결혼', '결혼', 'full_day', 8, 1, 'long_term', true, 1),
  ('자녀 결혼', '자녀결혼', 'full_day', 8, 1, 'none', true, 2),
  ('부모상', '부모상', 'full_day', 8, 1, 'long_term', true, 3),
  ('배우자상', '배우자상', 'full_day', 8, 1, 'long_term', true, 4),
  ('형제자매상', '형제자매상', 'full_day', 8, 1, 'long_term', true, 5),
  ('조부모상', '조부모상', 'full_day', 8, 1, 'long_term', true, 6),
  ('배우자 출산휴가', '배우자출산', 'full_day', 8, 1, 'long_term', true, 7)
) AS v(name, display_name, time_option, paid_hours, deduction_days, special_option, is_paid, sort_order)
WHERE g.name = '경조휴가' AND g.tenant_id IS NULL;

-- 출산·육아휴가 그룹
INSERT INTO public.leave_types (tenant_id, group_id, name, display_name, time_option, paid_hours, deduction_days, special_option, is_paid, sort_order)
SELECT NULL, g.id, v.name, v.display_name, v.time_option, v.paid_hours, v.deduction_days, v.special_option, v.is_paid, v.sort_order
FROM public.leave_groups g
CROSS JOIN (VALUES
  ('출산휴가', '출산휴가', 'full_day', 8, 1, 'long_term', true, 1),
  ('유산·사산휴가', '유산사산', 'full_day', 8, 1, 'long_term', true, 2),
  ('육아휴직', '육아휴직', 'full_day', 8, 1, 'long_term', false, 3),
  ('육아기 근로시간 단축', '육아단축', 'time_input', 4, 0, 'none', true, 4),
  ('임신기 근로시간 단축', '임신단축', 'time_input', 4, 0, 'none', true, 5)
) AS v(name, display_name, time_option, paid_hours, deduction_days, special_option, is_paid, sort_order)
WHERE g.name = '출산·육아휴가' AND g.tenant_id IS NULL;

-- 병가 그룹
INSERT INTO public.leave_types (tenant_id, group_id, name, display_name, time_option, paid_hours, deduction_days, special_option, is_paid, sort_order)
SELECT NULL, g.id, v.name, v.display_name, v.time_option, v.paid_hours, v.deduction_days, v.special_option, v.is_paid, v.sort_order
FROM public.leave_groups g
CROSS JOIN (VALUES
  ('병가(유급)', '병가유급', 'full_day', 8, 1, 'none', true, 1),
  ('병가(무급)', '병가무급', 'full_day', 0, 1, 'none', false, 2),
  ('장기 병가', '장기병가', 'full_day', 8, 1, 'long_term', true, 3),
  ('공상병가', '공상병가', 'full_day', 8, 1, 'long_term', true, 4)
) AS v(name, display_name, time_option, paid_hours, deduction_days, special_option, is_paid, sort_order)
WHERE g.name = '병가' AND g.tenant_id IS NULL;

-- 특별휴가 그룹
INSERT INTO public.leave_types (tenant_id, group_id, name, display_name, time_option, paid_hours, deduction_days, special_option, is_paid, sort_order)
SELECT NULL, g.id, v.name, v.display_name, v.time_option, v.paid_hours, v.deduction_days, v.special_option, v.is_paid, v.sort_order
FROM public.leave_groups g
CROSS JOIN (VALUES
  ('생일휴가', '생일', 'full_day', 8, 1, 'none', true, 1),
  ('리프레시 휴가', '리프레시', 'full_day', 8, 1, 'none', true, 2),
  ('장기근속 휴가', '장기근속', 'full_day', 8, 1, 'long_term', true, 3),
  ('창립기념일 휴가', '창립기념일', 'full_day', 8, 1, 'holiday', true, 4),
  ('포상휴가', '포상', 'full_day', 8, 1, 'none', true, 5)
) AS v(name, display_name, time_option, paid_hours, deduction_days, special_option, is_paid, sort_order)
WHERE g.name = '특별휴가' AND g.tenant_id IS NULL;

-- 무급휴가 그룹
INSERT INTO public.leave_types (tenant_id, group_id, name, display_name, time_option, paid_hours, deduction_days, special_option, is_paid, sort_order)
SELECT NULL, g.id, v.name, v.display_name, v.time_option, v.paid_hours, v.deduction_days, v.special_option, v.is_paid, v.sort_order
FROM public.leave_groups g
CROSS JOIN (VALUES
  ('개인사유 무급휴가', '무급휴가', 'full_day', 0, 1, 'none', false, 1),
  ('학업 무급휴가', '학업무급', 'full_day', 0, 1, 'none', false, 2),
  ('장기 무급휴직', '장기무급', 'full_day', 0, 1, 'long_term', false, 3)
) AS v(name, display_name, time_option, paid_hours, deduction_days, special_option, is_paid, sort_order)
WHERE g.name = '무급휴가' AND g.tenant_id IS NULL;

-- 대체휴무 그룹
INSERT INTO public.leave_types (tenant_id, group_id, name, display_name, time_option, paid_hours, deduction_days, special_option, is_paid, sort_order)
SELECT NULL, g.id, v.name, v.display_name, v.time_option, v.paid_hours, v.deduction_days, v.special_option, v.is_paid, v.sort_order
FROM public.leave_groups g
CROSS JOIN (VALUES
  ('휴일근무 대체휴무', '휴일대체', 'full_day', 8, 1, 'day_off', true, 1),
  ('주말근무 대체휴무', '주말대체', 'full_day', 8, 1, 'day_off', true, 2),
  ('공휴일 대체휴무', '공휴일대체', 'full_day', 8, 1, 'day_off', true, 3)
) AS v(name, display_name, time_option, paid_hours, deduction_days, special_option, is_paid, sort_order)
WHERE g.name = '대체휴무' AND g.tenant_id IS NULL;
