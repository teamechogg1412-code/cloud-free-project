
-- 주간 근무시간 계산 함수
CREATE OR REPLACE FUNCTION public.get_weekly_work_hours(
  _user_id uuid,
  _tenant_id uuid,
  _week_start date
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    SUM(
      EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600.0
    ), 0
  )::numeric
  FROM public.attendance_records
  WHERE user_id = _user_id
    AND tenant_id = _tenant_id
    AND date >= _week_start
    AND date < _week_start + 7
    AND clock_in IS NOT NULL
    AND clock_out IS NOT NULL;
$$;

-- 월간 근무시간 상세 데이터 함수
CREATE OR REPLACE FUNCTION public.get_monthly_work_hours(
  _user_id uuid,
  _tenant_id uuid,
  _year int,
  _month int
)
RETURNS TABLE(
  work_date date,
  hours_worked numeric,
  clock_in_time timestamptz,
  clock_out_time timestamptz,
  clock_out_method text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ar.date AS work_date,
    COALESCE(EXTRACT(EPOCH FROM (ar.clock_out - ar.clock_in)) / 3600.0, 0)::numeric AS hours_worked,
    ar.clock_in AS clock_in_time,
    ar.clock_out AS clock_out_time,
    ar.clock_out_method
  FROM public.attendance_records ar
  WHERE ar.user_id = _user_id
    AND ar.tenant_id = _tenant_id
    AND EXTRACT(YEAR FROM ar.date) = _year
    AND EXTRACT(MONTH FROM ar.date) = _month
    AND ar.clock_in IS NOT NULL
  ORDER BY ar.date ASC;
$$;
