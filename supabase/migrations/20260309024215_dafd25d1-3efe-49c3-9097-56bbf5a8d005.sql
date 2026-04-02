
-- 작품 등록 테이블
CREATE TABLE public.works (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT '드라마',
  channel TEXT,
  title TEXT NOT NULL,
  received_date DATE,
  is_rejected BOOLEAN NOT NULL DEFAULT false,
  director TEXT,
  director_detail TEXT,
  writer TEXT,
  writer_detail TEXT,
  production_company TEXT,
  production_detail TEXT,
  current_casting TEXT,
  notes TEXT,
  contact_person TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage works"
ON public.works FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 캐스팅 제안 테이블
CREATE TABLE public.casting_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  from_tenant_id UUID NOT NULL,
  to_tenant_id UUID NOT NULL,
  artist_id UUID,
  role_name TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMP WITH TIME ZONE,
  response_note TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.casting_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage casting_offers"
ON public.casting_offers FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
