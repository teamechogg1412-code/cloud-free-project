-- 키워드 관리 테이블
CREATE TABLE public.keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 배우/아티스트 정보 테이블
CREATE TABLE public.artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage_name TEXT,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  profile_image_url TEXT,
  bio TEXT,
  agency TEXT,
  debut_date DATE,
  social_links JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 회사별 API 설정 테이블
CREATE TABLE public.tenant_api_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, config_key)
);

-- 시스템 전역 설정 테이블 (슈퍼어드민용)
CREATE TABLE public.system_configs (
  key TEXT NOT NULL PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 언론사 연락처 테이블
CREATE TABLE public.press_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_company TEXT NOT NULL,
  reporter_name TEXT NOT NULL,
  contact_email TEXT NOT NULL UNIQUE,
  contact_phone TEXT,
  purpose TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- RLS 활성화
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_api_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.press_contacts ENABLE ROW LEVEL SECURITY;

-- keywords RLS 정책
CREATE POLICY "Tenant members can view keywords"
  ON public.keywords FOR SELECT
  USING (public.is_tenant_member(tenant_id) OR public.is_sys_super_admin());

CREATE POLICY "Tenant admins can manage keywords"
  ON public.keywords FOR ALL
  USING (public.is_tenant_admin(tenant_id) OR public.is_sys_super_admin());

-- artists RLS 정책
CREATE POLICY "Tenant members can view artists"
  ON public.artists FOR SELECT
  USING (public.is_tenant_member(tenant_id) OR public.is_sys_super_admin());

CREATE POLICY "Tenant admins can manage artists"
  ON public.artists FOR ALL
  USING (public.is_tenant_admin(tenant_id) OR public.is_sys_super_admin());

-- tenant_api_configs RLS 정책 (관리자만)
CREATE POLICY "Tenant admins can view api configs"
  ON public.tenant_api_configs FOR SELECT
  USING (public.is_tenant_admin(tenant_id) OR public.is_sys_super_admin());

CREATE POLICY "Tenant admins can manage api configs"
  ON public.tenant_api_configs FOR ALL
  USING (public.is_tenant_admin(tenant_id) OR public.is_sys_super_admin());

-- system_configs RLS 정책 (슈퍼어드민만)
CREATE POLICY "Super admins can view system configs"
  ON public.system_configs FOR SELECT
  USING (public.is_sys_super_admin());

CREATE POLICY "Super admins can manage system configs"
  ON public.system_configs FOR ALL
  USING (public.is_sys_super_admin());

-- press_contacts RLS 정책 (슈퍼어드민만)
CREATE POLICY "Super admins can view press contacts"
  ON public.press_contacts FOR SELECT
  USING (public.is_sys_super_admin());

CREATE POLICY "Super admins can manage press contacts"
  ON public.press_contacts FOR ALL
  USING (public.is_sys_super_admin());

-- 업데이트 트리거 적용
CREATE TRIGGER update_keywords_updated_at
  BEFORE UPDATE ON public.keywords
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_artists_updated_at
  BEFORE UPDATE ON public.artists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_api_configs_updated_at
  BEFORE UPDATE ON public.tenant_api_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_configs_updated_at
  BEFORE UPDATE ON public.system_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_press_contacts_updated_at
  BEFORE UPDATE ON public.press_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 초기 시스템 설정값 삽입
INSERT INTO public.system_configs (key, value, description, category) VALUES
  ('huggingface_token', '', 'Hugging Face API 토큰', 'AI'),
  ('huggingface_model', 'meta-llama/Llama-3.1-8B-Instruct', '사용할 HuggingFace 모델', 'AI');