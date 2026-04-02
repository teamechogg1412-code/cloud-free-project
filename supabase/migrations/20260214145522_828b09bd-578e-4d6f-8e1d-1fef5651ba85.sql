
-- 1. 프로필에 서명 URL 추가
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_url text;

-- 2. 결제라인 테이블 생성
CREATE TABLE public.approval_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  approver_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, step_order)
);

-- RLS 활성화
ALTER TABLE public.approval_lines ENABLE ROW LEVEL SECURITY;

-- 본인의 결제라인 조회
CREATE POLICY "Users can view own approval lines"
ON public.approval_lines FOR SELECT
USING (
  user_id = auth.uid()
  OR is_tenant_admin(tenant_id)
  OR is_sys_super_admin()
);

-- 본인의 결제라인 생성
CREATE POLICY "Users can create own approval lines"
ON public.approval_lines FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR is_tenant_admin(tenant_id)
  OR is_sys_super_admin()
);

-- 본인의 결제라인 수정
CREATE POLICY "Users can update own approval lines"
ON public.approval_lines FOR UPDATE
USING (
  user_id = auth.uid()
  OR is_tenant_admin(tenant_id)
  OR is_sys_super_admin()
);

-- 본인의 결제라인 삭제
CREATE POLICY "Users can delete own approval lines"
ON public.approval_lines FOR DELETE
USING (
  user_id = auth.uid()
  OR is_tenant_admin(tenant_id)
  OR is_sys_super_admin()
);

-- updated_at 트리거
CREATE TRIGGER update_approval_lines_updated_at
BEFORE UPDATE ON public.approval_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
