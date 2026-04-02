-- 1. 부서 테이블
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. 직급 테이블
CREATE TABLE public.job_titles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. 프로젝트 테이블
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  pm_user_id UUID,
  created_by UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. 법인카드 테이블
CREATE TABLE public.corporate_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_number TEXT NOT NULL,
  card_name TEXT,
  card_company TEXT,
  holder_user_id UUID,
  monthly_limit NUMERIC,
  is_active BOOLEAN DEFAULT true,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. 법인카드 사용내역 테이블
CREATE TABLE public.card_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.corporate_cards(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  merchant_name TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  receipt_url TEXT,
  memo TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. 차량 테이블
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  model TEXT,
  manufacturer TEXT,
  year INTEGER,
  vin TEXT,
  lease_company TEXT,
  lease_start_date DATE,
  lease_end_date DATE,
  monthly_lease_cost NUMERIC,
  insurance_company TEXT,
  insurance_expiry DATE,
  assigned_user_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. 차량 사고 이력 테이블
CREATE TABLE public.vehicle_accidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  accident_date DATE NOT NULL,
  description TEXT,
  damage_cost NUMERIC,
  insurance_claim BOOLEAN DEFAULT false,
  claim_amount NUMERIC,
  driver_user_id UUID,
  status TEXT DEFAULT 'reported',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_accidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Tenant members can view departments" ON public.departments
  FOR SELECT USING (is_tenant_member(tenant_id) OR is_sys_super_admin());
CREATE POLICY "Tenant admins can manage departments" ON public.departments
  FOR ALL USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- RLS Policies for job_titles
CREATE POLICY "Tenant members can view job_titles" ON public.job_titles
  FOR SELECT USING (is_tenant_member(tenant_id) OR is_sys_super_admin());
CREATE POLICY "Tenant admins can manage job_titles" ON public.job_titles
  FOR ALL USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- RLS Policies for projects
CREATE POLICY "Tenant members can view projects" ON public.projects
  FOR SELECT USING (is_tenant_member(tenant_id) OR is_sys_super_admin());
CREATE POLICY "Tenant admins can manage projects" ON public.projects
  FOR ALL USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- RLS Policies for corporate_cards
CREATE POLICY "Tenant members can view corporate_cards" ON public.corporate_cards
  FOR SELECT USING (is_tenant_member(tenant_id) OR is_sys_super_admin());
CREATE POLICY "Tenant admins can manage corporate_cards" ON public.corporate_cards
  FOR ALL USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- RLS Policies for card_transactions
CREATE POLICY "Tenant members can view card_transactions" ON public.card_transactions
  FOR SELECT USING (is_tenant_member(tenant_id) OR is_sys_super_admin());
CREATE POLICY "Tenant admins can manage card_transactions" ON public.card_transactions
  FOR ALL USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- RLS Policies for vehicles
CREATE POLICY "Tenant members can view vehicles" ON public.vehicles
  FOR SELECT USING (is_tenant_member(tenant_id) OR is_sys_super_admin());
CREATE POLICY "Tenant admins can manage vehicles" ON public.vehicles
  FOR ALL USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- RLS Policies for vehicle_accidents
CREATE POLICY "Tenant members can view vehicle_accidents" ON public.vehicle_accidents
  FOR SELECT USING (is_tenant_member(tenant_id) OR is_sys_super_admin());
CREATE POLICY "Tenant admins can manage vehicle_accidents" ON public.vehicle_accidents
  FOR ALL USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- Add updated_at triggers
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_job_titles_updated_at BEFORE UPDATE ON public.job_titles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_corporate_cards_updated_at BEFORE UPDATE ON public.corporate_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicle_accidents_updated_at BEFORE UPDATE ON public.vehicle_accidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();