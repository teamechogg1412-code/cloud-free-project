
-- 1. 직원별 고유 청구 링크
CREATE TABLE public.invoice_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage own invoice_links"
  ON public.invoice_links FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. 외부 청구서
CREATE TABLE public.external_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_token text NOT NULL,
  tenant_id uuid NOT NULL,
  assigned_to uuid NOT NULL,
  vendor_name text NOT NULL,
  vendor_email text,
  vendor_phone text,
  vendor_company text,
  description text,
  total_amount numeric DEFAULT 0,
  file_urls jsonb DEFAULT '[]'::jsonb,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  converted_expense_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.external_invoices ENABLE ROW LEVEL SECURITY;

-- 공개 INSERT (거래처가 비로그인 상태로 제출)
CREATE POLICY "Anyone can insert external_invoices"
  ON public.external_invoices FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 인증 사용자만 조회/수정/삭제
CREATE POLICY "Authenticated users can read external_invoices"
  ON public.external_invoices FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update external_invoices"
  ON public.external_invoices FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. 공개 읽기 정책 for invoice_links (토큰 검증용)
CREATE POLICY "Anyone can read active invoice_links by token"
  ON public.invoice_links FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- 4. 스토리지 버킷
INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-attachments', 'invoice-attachments', true);

-- 5. 스토리지 RLS - 누구나 업로드 가능, 인증 사용자는 읽기 가능
CREATE POLICY "Anyone can upload invoice attachments"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'invoice-attachments');

CREATE POLICY "Anyone can read invoice attachments"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'invoice-attachments');
