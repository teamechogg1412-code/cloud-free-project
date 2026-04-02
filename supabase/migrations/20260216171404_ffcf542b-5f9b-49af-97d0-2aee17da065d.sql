
CREATE OR REPLACE FUNCTION public.auto_clock_out()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  affected_count int := 0;
  rec RECORD;
  auto_count int := 0;
BEGIN
  -- Step 1: 일정 참석자 기반 퇴근 처리
  FOR rec IN
    SELECT DISTINCT
      sp.user_id,
      ar.tenant_id,
      ar.id AS attendance_id,
      MAX(s.end_time) AS latest_end
    FROM public.attendance_records ar
    JOIN public.schedule_participants sp ON sp.user_id = ar.user_id AND sp.tenant_id = ar.tenant_id
    JOIN public.artist_schedules s ON s.id = sp.schedule_id
    WHERE ar.date = CURRENT_DATE
      AND ar.clock_in IS NOT NULL
      AND ar.clock_out IS NULL
      AND s.end_time::date = CURRENT_DATE
      AND s.end_time <= now()
      AND sp.user_id IS NOT NULL
    GROUP BY sp.user_id, ar.tenant_id, ar.id
  LOOP
    UPDATE public.attendance_records
    SET clock_out = rec.latest_end,
        clock_out_method = 'schedule'
    WHERE id = rec.attendance_id;
    affected_count := affected_count + 1;
  END LOOP;

  -- Step 2: 18시 이후 미퇴근자 자동 퇴근 처리
  UPDATE public.attendance_records
  SET clock_out = (date || ' 18:00:00')::timestamp with time zone,
      clock_out_method = 'auto'
  WHERE date = CURRENT_DATE
    AND clock_in IS NOT NULL
    AND clock_out IS NULL
    AND now() >= (date || ' 18:00:00')::timestamp with time zone;

  GET DIAGNOSTICS auto_count = ROW_COUNT;
  affected_count := affected_count + auto_count;

  RETURN affected_count;
END;
$$;
