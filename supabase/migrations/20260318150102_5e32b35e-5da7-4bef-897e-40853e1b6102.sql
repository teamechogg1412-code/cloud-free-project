
-- 1. 아티스트 기본 배분 비율 (카테고리별)
CREATE TABLE public.artist_revenue_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT '드라마', -- 드라마, 광고, 행사, 기타
  artist_rate NUMERIC NOT NULL DEFAULT 70, -- 배우 비율 %
  company_rate NUMERIC NOT NULL DEFAULT 30, -- 회사 비율 %
  mgmt_fee_rate NUMERIC NOT NULL DEFAULT 0, -- 매니지먼트 수수료 %
  tax_rate NUMERIC NOT NULL DEFAULT 3.3, -- 원천징수 세율 %
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, artist_id, category)
);

-- 2. 프로젝트별 배분 비율 오버라이드
CREATE TABLE public.project_revenue_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  artist_rate NUMERIC NOT NULL DEFAULT 70,
  company_rate NUMERIC NOT NULL DEFAULT 30,
  mgmt_fee_rate NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 3.3,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, project_id, artist_id)
);

-- 3. 수익정산서 (정산 보고서)
CREATE TABLE public.revenue_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  settlement_period TEXT NOT NULL, -- 예: '2026-03', '2026-Q1'
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  artist_amount NUMERIC NOT NULL DEFAULT 0,
  company_amount NUMERIC NOT NULL DEFAULT 0,
  mgmt_fee NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  net_artist_amount NUMERIC NOT NULL DEFAULT 0, -- 최종 배우 수령액
  status TEXT NOT NULL DEFAULT 'draft', -- draft, confirmed, paid
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. 정산서 항목 (프로젝트별 상세)
CREATE TABLE public.revenue_settlement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES public.revenue_settlements(id) ON DELETE CASCADE,
  project_id UUID,
  project_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '드라마',
  contract_amount NUMERIC NOT NULL DEFAULT 0,
  artist_rate NUMERIC NOT NULL DEFAULT 70,
  artist_amount NUMERIC NOT NULL DEFAULT 0,
  company_rate NUMERIC NOT NULL DEFAULT 30,
  company_amount NUMERIC NOT NULL DEFAULT 0,
  mgmt_fee_rate NUMERIC NOT NULL DEFAULT 0,
  mgmt_fee NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 3.3,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. 공제 항목 (기타 공제)
CREATE TABLE public.revenue_settlement_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES public.revenue_settlements(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  deduction_type TEXT NOT NULL DEFAULT 'etc', -- advance (선급금), training (교육비), costume (의상비), etc
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.artist_revenue_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_revenue_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_settlement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_settlement_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage artist_revenue_rates" ON public.artist_revenue_rates FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage project_revenue_rates" ON public.project_revenue_rates FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage revenue_settlements" ON public.revenue_settlements FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage revenue_settlement_items" ON public.revenue_settlement_items FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage revenue_settlement_deductions" ON public.revenue_settlement_deductions FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
