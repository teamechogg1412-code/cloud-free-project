-- 회원가입 요청 테이블 (승인 대기)
CREATE TABLE public.signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamp with time zone,
  assigned_tenant_id uuid REFERENCES tenants(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 요청만 볼 수 있음
CREATE POLICY "Users can view their own requests"
ON public.signup_requests
FOR SELECT
USING (user_id = auth.uid() OR is_sys_super_admin());

-- 사용자는 자신의 요청 생성 가능
CREATE POLICY "Users can create their own requests"
ON public.signup_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 슈퍼 어드민만 요청 수정 가능 (승인/거절)
CREATE POLICY "Super admins can update requests"
ON public.signup_requests
FOR UPDATE
USING (is_sys_super_admin());

-- 슈퍼 어드민만 요청 삭제 가능
CREATE POLICY "Super admins can delete requests"
ON public.signup_requests
FOR DELETE
USING (is_sys_super_admin());

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_signup_requests_updated_at
BEFORE UPDATE ON public.signup_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 첫 사용자 자동 배정 트리거 삭제 (더 이상 필요 없음)
DROP TRIGGER IF EXISTS on_profile_created_assign_first_user ON profiles;
DROP FUNCTION IF EXISTS auto_assign_first_user_to_boteda();