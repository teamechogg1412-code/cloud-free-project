CREATE TABLE public.expense_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT '일반',
  total_amount numeric NOT NULL DEFAULT 0,
  description text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamp with time zone,
  reject_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.expense_report_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_report_id uuid NOT NULL REFERENCES public.expense_reports(id) ON DELETE CASCADE,
  item_date date NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text DEFAULT '법인카드',
  receipt_note text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_report_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage expense_reports"
ON public.expense_reports FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage expense_report_items"
ON public.expense_report_items FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);