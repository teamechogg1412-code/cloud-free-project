
-- 표준 규정 테이블
CREATE TABLE IF NOT EXISTS public.standard_regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT '기타',
  title text NOT NULL,
  content text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.standard_regulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read standard_regulations"
  ON public.standard_regulations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage standard_regulations"
  ON public.standard_regulations FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 테넌트별 규정 설정 테이블
CREATE TABLE IF NOT EXISTS public.tenant_regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  category text NOT NULL,
  use_standard boolean DEFAULT true,
  custom_title text,
  custom_content text,
  standard_regulation_id uuid REFERENCES public.standard_regulations(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tenant_regulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tenant_regulations"
  ON public.tenant_regulations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage tenant_regulations"
  ON public.tenant_regulations FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
