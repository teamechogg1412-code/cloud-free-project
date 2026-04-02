
-- =============================================
-- Phase 3: Extend RLS for partner data access
-- =============================================
-- 파트너사가 data_scopes에 따라 연결된 회사의 데이터를 열람할 수 있도록 
-- 각 테이블의 SELECT 정책에 파트너 접근 조건을 추가합니다.

-- 1. artists 테이블: 'artists' 스코프
DROP POLICY IF EXISTS "Tenant members can view artists" ON public.artists;
CREATE POLICY "Tenant members and partners can view artists"
  ON public.artists FOR SELECT
  USING (
    is_tenant_member(tenant_id)
    OR is_sys_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
      AND has_partner_scope(tm.tenant_id, artists.tenant_id, 'artists')
    )
  );

-- 2. projects 테이블: 'projects' 스코프
DROP POLICY IF EXISTS "Tenant members can view projects" ON public.projects;
CREATE POLICY "Tenant members and partners can view projects"
  ON public.projects FOR SELECT
  USING (
    is_tenant_member(tenant_id)
    OR is_sys_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
      AND has_partner_scope(tm.tenant_id, projects.tenant_id, 'projects')
    )
  );

-- 3. keywords 테이블: 'keywords' 스코프
DROP POLICY IF EXISTS "Tenant members can view keywords" ON public.keywords;
CREATE POLICY "Tenant members and partners can view keywords"
  ON public.keywords FOR SELECT
  USING (
    is_tenant_member(tenant_id)
    OR is_sys_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
      AND has_partner_scope(tm.tenant_id, keywords.tenant_id, 'keywords')
    )
  );

-- 4. hr_records 테이블: 'hr' 스코프
DROP POLICY IF EXISTS "Tenant members can view hr_records" ON public.hr_records;
CREATE POLICY "Tenant members and partners can view hr_records"
  ON public.hr_records FOR SELECT
  USING (
    is_tenant_member(tenant_id)
    OR is_sys_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
      AND has_partner_scope(tm.tenant_id, hr_records.tenant_id, 'hr')
    )
  );

-- 5. corporate_cards 테이블: 'finance' 스코프 (기존 정책 유지 + 파트너 추가)
DROP POLICY IF EXISTS "Only admins and card holders can view corporate_cards" ON public.corporate_cards;
CREATE POLICY "Admins card holders and partners can view corporate_cards"
  ON public.corporate_cards FOR SELECT
  USING (
    is_tenant_admin(tenant_id)
    OR is_sys_super_admin()
    OR (holder_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
      AND has_partner_scope(tm.tenant_id, corporate_cards.tenant_id, 'finance')
    )
  );

-- 6. card_transactions 테이블: 'finance' 스코프
DROP POLICY IF EXISTS "Tenant members can view card_transactions" ON public.card_transactions;
CREATE POLICY "Tenant members and partners can view card_transactions"
  ON public.card_transactions FOR SELECT
  USING (
    is_tenant_member(tenant_id)
    OR is_sys_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
      AND has_partner_scope(tm.tenant_id, card_transactions.tenant_id, 'finance')
    )
  );

-- 7. tenant_memberships 테이블: 파트너사가 'hr' 스코프로 직원 정보 열람
DROP POLICY IF EXISTS "Members can view tenant memberships" ON public.tenant_memberships;
CREATE POLICY "Members and partners can view tenant memberships"
  ON public.tenant_memberships FOR SELECT
  USING (
    is_tenant_member(tenant_id)
    OR is_sys_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships my_tm
      WHERE my_tm.user_id = auth.uid()
      AND has_partner_scope(my_tm.tenant_id, tenant_memberships.tenant_id, 'hr')
    )
  );
