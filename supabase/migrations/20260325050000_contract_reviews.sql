-- profiles에 telegram_chat_id 추가 (개인 DM 알림용)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- 계약서 검토 요청 테이블
CREATE TABLE IF NOT EXISTS public.contract_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'revision')),
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contract_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_member_access" ON public.contract_reviews
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_member_insert" ON public.contract_reviews
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_member_update" ON public.contract_reviews
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()
    )
  );

-- Storage 버킷 (계약서 파일 저장)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-reviews',
  'contract-reviews',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png', 'image/jpeg'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "authenticated_upload_contracts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contract-reviews');

CREATE POLICY "authenticated_read_contracts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contract-reviews');
