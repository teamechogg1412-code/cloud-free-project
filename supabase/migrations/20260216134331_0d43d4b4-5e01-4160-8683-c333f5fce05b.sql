
-- 출퇴근지 정보 테이블
CREATE TABLE public.commute_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  home_address text,
  home_lat numeric,
  home_lng numeric,
  office_address text,
  office_lat numeric,
  office_lng numeric,
  distance_km numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

ALTER TABLE public.commute_locations ENABLE ROW LEVEL SECURITY;

-- 본인 데이터 조회
CREATE POLICY "Users can view own commute locations"
ON public.commute_locations FOR SELECT
USING (user_id = auth.uid() OR is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- 본인 데이터 생성
CREATE POLICY "Users can insert own commute locations"
ON public.commute_locations FOR INSERT
WITH CHECK (user_id = auth.uid() AND is_tenant_member(tenant_id));

-- 본인 데이터 수정
CREATE POLICY "Users can update own commute locations"
ON public.commute_locations FOR UPDATE
USING (user_id = auth.uid() OR is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- 관리자 삭제
CREATE POLICY "Admins can delete commute locations"
ON public.commute_locations FOR DELETE
USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- updated_at 트리거
CREATE TRIGGER update_commute_locations_updated_at
BEFORE UPDATE ON public.commute_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
