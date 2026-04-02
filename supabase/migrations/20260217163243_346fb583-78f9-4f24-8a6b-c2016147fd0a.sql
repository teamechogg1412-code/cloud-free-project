
-- 은행 계좌 및 카드 계정 정보를 저장하는 테이블
CREATE TABLE public.finance_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connected_id_key TEXT NOT NULL, -- tenant_api_configs의 config_key (예: CONNECTED_ID_BK_0004)
  business_type TEXT NOT NULL CHECK (business_type IN ('BK', 'CD')), -- BK: 은행, CD: 카드
  organization TEXT NOT NULL, -- 기관코드
  account_number TEXT, -- 계좌번호 (은행) 또는 카드번호 (카드), 비워두면 전체
  account_alias TEXT, -- 별칭 (예: "급여통장", "운영자금")
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage finance_accounts"
  ON public.finance_accounts FOR ALL
  USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

CREATE POLICY "Tenant members can view finance_accounts"
  ON public.finance_accounts FOR SELECT
  USING (is_tenant_member(tenant_id) OR is_sys_super_admin());
