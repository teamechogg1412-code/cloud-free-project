
-- 1. 파트너십 테이블 생성
CREATE TABLE public.tenant_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  target_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, active, rejected, revoked
  data_scopes TEXT[] NOT NULL DEFAULT '{}', -- 공유 데이터 범위: artists, projects, hr, finance, keywords
  message TEXT,  -- 초대 시 메시지
  invited_by UUID REFERENCES public.profiles(id),
  accepted_by UUID REFERENCES public.profiles(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_partnership UNIQUE(requester_tenant_id, target_tenant_id),
  CONSTRAINT no_self_partnership CHECK (requester_tenant_id != target_tenant_id)
);

-- 2. RLS 활성화
ALTER TABLE public.tenant_partnerships ENABLE ROW LEVEL SECURITY;

-- 3. 양쪽 테넌트의 멤버가 조회 가능
CREATE POLICY "Members can view their partnerships"
  ON public.tenant_partnerships FOR SELECT
  USING (
    is_tenant_member(requester_tenant_id) 
    OR is_tenant_member(target_tenant_id) 
    OR is_sys_super_admin()
  );

-- 4. 테넌트 어드민만 파트너십 생성 가능
CREATE POLICY "Admins can create partnerships"
  ON public.tenant_partnerships FOR INSERT
  WITH CHECK (
    is_tenant_admin(requester_tenant_id) 
    OR is_sys_super_admin()
  );

-- 5. 양쪽 어드민이 업데이트 가능 (수락/거절/취소)
CREATE POLICY "Admins can update partnerships"
  ON public.tenant_partnerships FOR UPDATE
  USING (
    is_tenant_admin(requester_tenant_id) 
    OR is_tenant_admin(target_tenant_id) 
    OR is_sys_super_admin()
  );

-- 6. 요청한 쪽 어드민만 삭제 가능
CREATE POLICY "Requester admins can delete partnerships"
  ON public.tenant_partnerships FOR DELETE
  USING (
    is_tenant_admin(requester_tenant_id) 
    OR is_sys_super_admin()
  );

-- 7. 인덱스
CREATE INDEX idx_partnerships_requester ON public.tenant_partnerships(requester_tenant_id);
CREATE INDEX idx_partnerships_target ON public.tenant_partnerships(target_tenant_id);
CREATE INDEX idx_partnerships_status ON public.tenant_partnerships(status);

-- 8. updated_at 트리거
CREATE TRIGGER update_partnerships_updated_at
  BEFORE UPDATE ON public.tenant_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. 파트너 여부를 확인하는 security definer 함수
CREATE OR REPLACE FUNCTION public.is_active_partner(tenant_a UUID, tenant_b UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_partnerships
    WHERE status = 'active'
    AND (
      (requester_tenant_id = tenant_a AND target_tenant_id = tenant_b)
      OR (requester_tenant_id = tenant_b AND target_tenant_id = tenant_a)
    )
  )
$$;

-- 10. 특정 데이터 스코프가 공유되었는지 확인하는 함수
CREATE OR REPLACE FUNCTION public.has_partner_scope(tenant_a UUID, tenant_b UUID, scope TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_partnerships
    WHERE status = 'active'
    AND scope = ANY(data_scopes)
    AND (
      (requester_tenant_id = tenant_a AND target_tenant_id = tenant_b)
      OR (requester_tenant_id = tenant_b AND target_tenant_id = tenant_a)
    )
  )
$$;
