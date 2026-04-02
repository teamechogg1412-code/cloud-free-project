
-- departments 테이블: tenant_id를 nullable로 변경 (시스템 기본값용)
ALTER TABLE public.departments ALTER COLUMN tenant_id DROP NOT NULL;

-- job_titles 테이블: tenant_id를 nullable로 변경 (시스템 기본값용)
ALTER TABLE public.job_titles ALTER COLUMN tenant_id DROP NOT NULL;

-- departments: 시스템 기본값 조회 정책 (모든 인증 사용자)
CREATE POLICY "Authenticated users can view system default departments"
ON public.departments FOR SELECT
USING (tenant_id IS NULL AND auth.uid() IS NOT NULL);

-- departments: 슈퍼어드민 시스템 기본값 관리 정책
CREATE POLICY "Super admins can manage system default departments"
ON public.departments FOR ALL
USING (is_sys_super_admin());

-- job_titles: 시스템 기본값 조회 정책 (모든 인증 사용자)
CREATE POLICY "Authenticated users can view system default job_titles"
ON public.job_titles FOR SELECT
USING (tenant_id IS NULL AND auth.uid() IS NOT NULL);

-- job_titles: 슈퍼어드민 시스템 기본값 관리 정책
CREATE POLICY "Super admins can manage system default job_titles"
ON public.job_titles FOR ALL
USING (is_sys_super_admin());
