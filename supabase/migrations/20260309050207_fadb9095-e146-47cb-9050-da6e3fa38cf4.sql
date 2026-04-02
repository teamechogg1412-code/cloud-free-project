
-- 지출결의서 자동생성 템플릿 테이블
CREATE TABLE public.expense_report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT '일반',
  description text,
  day_of_month integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  assignee_user_id uuid NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 템플릿 항목 테이블
CREATE TABLE public.expense_report_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.expense_report_templates(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text DEFAULT '법인카드',
  receipt_note text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.expense_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_report_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage expense_report_templates"
ON public.expense_report_templates FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage expense_report_template_items"
ON public.expense_report_template_items FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
