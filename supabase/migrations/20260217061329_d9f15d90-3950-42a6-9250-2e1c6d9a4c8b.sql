
-- 사용자별 메일 연동 설정 테이블
CREATE TABLE public.user_mail_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'naverworks')),
  
  -- Gmail OAuth fields
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TIMESTAMP WITH TIME ZONE,
  google_email TEXT,
  
  -- NaverWorks API key fields
  nw_client_id TEXT,
  nw_client_secret TEXT,
  nw_service_account TEXT,
  nw_private_key TEXT,
  nw_domain_id TEXT,
  nw_user_id TEXT,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, tenant_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_mail_configs ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own mail configs
CREATE POLICY "Users can view own mail configs"
  ON public.user_mail_configs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own mail configs"
  ON public.user_mail_configs FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_tenant_member(tenant_id));

CREATE POLICY "Users can update own mail configs"
  ON public.user_mail_configs FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own mail configs"
  ON public.user_mail_configs FOR DELETE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_user_mail_configs_updated_at
  BEFORE UPDATE ON public.user_mail_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
