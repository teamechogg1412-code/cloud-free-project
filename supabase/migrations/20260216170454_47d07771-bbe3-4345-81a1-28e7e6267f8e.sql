
-- 1. 출퇴근 기록 테이블
CREATE TABLE public.attendance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  clock_in timestamp with time zone,
  clock_out timestamp with time zone,
  clock_in_method text NOT NULL DEFAULT 'manual',
  clock_out_method text NOT NULL DEFAULT 'manual',
  memo text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, date)
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance"
  ON public.attendance_records FOR SELECT
  USING (user_id = auth.uid() OR is_tenant_admin(tenant_id) OR is_sys_super_admin());

CREATE POLICY "Users can insert own attendance"
  ON public.attendance_records FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_tenant_member(tenant_id));

CREATE POLICY "Users can update own attendance"
  ON public.attendance_records FOR UPDATE
  USING (user_id = auth.uid() OR is_tenant_admin(tenant_id) OR is_sys_super_admin());

CREATE POLICY "Admins can delete attendance"
  ON public.attendance_records FOR DELETE
  USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. 일정 참석자 테이블
CREATE TABLE public.schedule_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id uuid NOT NULL REFERENCES public.artist_schedules(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  participant_name text,
  participant_company text,
  participant_type text NOT NULL DEFAULT 'internal',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view participants"
  ON public.schedule_participants FOR SELECT
  USING (is_tenant_member(tenant_id) OR is_sys_super_admin());

CREATE POLICY "Tenant members can manage participants"
  ON public.schedule_participants FOR INSERT
  WITH CHECK (is_tenant_member(tenant_id));

CREATE POLICY "Tenant members can update participants"
  ON public.schedule_participants FOR UPDATE
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant members can delete participants"
  ON public.schedule_participants FOR DELETE
  USING (is_tenant_member(tenant_id));
