-- =============================================
-- Botida OS 멀티 테넌트 데이터베이스 스키마
-- =============================================

-- 1. 역할 Enum 생성
CREATE TYPE public.tenant_role AS ENUM ('company_admin', 'manager', 'employee');
CREATE TYPE public.system_role AS ENUM ('sys_super_admin', 'regular_user');

-- 2. 프로필 테이블 (사용자 기본 정보)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  system_role system_role NOT NULL DEFAULT 'regular_user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. 테넌트(회사) 테이블
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. 테넌트 멤버십 테이블 (사용자-회사 연결 + 역할)
CREATE TABLE public.tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role tenant_role NOT NULL DEFAULT 'employee',
  department TEXT,
  job_title TEXT,
  invited_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- 5. 외부 거래처 청구 테이블
CREATE TABLE public.vendor_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  business_number TEXT,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. 청구서 첨부파일 테이블
CREATE TABLE public.invoice_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.vendor_invoices(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 헬퍼 함수들
-- =============================================

-- 시스템 슈퍼어드민 확인 함수
CREATE OR REPLACE FUNCTION public.is_sys_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND system_role = 'sys_super_admin'
  )
$$;

-- 테넌트 멤버 확인 함수
CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id = auth.uid()
    AND tenant_id = _tenant_id
  )
$$;

-- 테넌트 관리자 확인 함수
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id = auth.uid()
    AND tenant_id = _tenant_id
    AND role = 'company_admin'
  )
$$;

-- 테넌트 매니저 이상 확인 함수
CREATE OR REPLACE FUNCTION public.is_tenant_manager_or_admin(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id = auth.uid()
    AND tenant_id = _tenant_id
    AND role IN ('company_admin', 'manager')
  )
$$;

-- 사용자의 모든 테넌트 ID 반환 함수
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_memberships
  WHERE user_id = auth.uid()
$$;

-- =============================================
-- RLS 활성화
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_attachments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS 정책
-- =============================================

-- Profiles 정책
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_sys_super_admin());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "System creates profile on signup"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Tenants 정책
CREATE POLICY "Members can view their tenants"
  ON public.tenants FOR SELECT
  USING (public.is_tenant_member(id) OR public.is_sys_super_admin());

CREATE POLICY "Super admins can create tenants"
  ON public.tenants FOR INSERT
  WITH CHECK (public.is_sys_super_admin());

CREATE POLICY "Super admins can update tenants"
  ON public.tenants FOR UPDATE
  USING (public.is_sys_super_admin());

CREATE POLICY "Super admins can delete tenants"
  ON public.tenants FOR DELETE
  USING (public.is_sys_super_admin());

-- Tenant Memberships 정책
CREATE POLICY "Members can view tenant memberships"
  ON public.tenant_memberships FOR SELECT
  USING (public.is_tenant_member(tenant_id) OR public.is_sys_super_admin());

CREATE POLICY "Admins can create memberships"
  ON public.tenant_memberships FOR INSERT
  WITH CHECK (
    public.is_sys_super_admin() OR 
    (public.is_tenant_admin(tenant_id) AND invited_by = auth.uid())
  );

CREATE POLICY "Admins can update memberships"
  ON public.tenant_memberships FOR UPDATE
  USING (
    public.is_sys_super_admin() OR 
    public.is_tenant_admin(tenant_id)
  );

CREATE POLICY "Admins can delete memberships"
  ON public.tenant_memberships FOR DELETE
  USING (
    public.is_sys_super_admin() OR 
    (public.is_tenant_admin(tenant_id) AND user_id != auth.uid())
  );

-- Vendor Invoices 정책
CREATE POLICY "Members can view tenant invoices"
  ON public.vendor_invoices FOR SELECT
  USING (public.is_tenant_member(tenant_id) OR public.is_sys_super_admin());

CREATE POLICY "Anyone can submit invoice (guest form)"
  ON public.vendor_invoices FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Members can update invoices"
  ON public.vendor_invoices FOR UPDATE
  USING (public.is_tenant_member(tenant_id) OR public.is_sys_super_admin());

-- Invoice Attachments 정책
CREATE POLICY "Members can view attachments"
  ON public.invoice_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vendor_invoices vi
      WHERE vi.id = invoice_id
      AND (public.is_tenant_member(vi.tenant_id) OR public.is_sys_super_admin())
    )
  );

CREATE POLICY "Anyone can add attachments (guest form)"
  ON public.invoice_attachments FOR INSERT
  WITH CHECK (true);

-- =============================================
-- 자동 프로필 생성 트리거
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- Updated_at 자동 업데이트 트리거
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_memberships_updated_at
  BEFORE UPDATE ON public.tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendor_invoices_updated_at
  BEFORE UPDATE ON public.vendor_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();