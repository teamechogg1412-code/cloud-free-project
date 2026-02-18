
-- Create HR records table for tracking employee history
CREATE TABLE public.hr_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL, -- 'hire', 'promotion', 'transfer', 'leave', 'return', 'resignation', 'note'
  title TEXT NOT NULL,
  description TEXT,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  old_department TEXT,
  new_department TEXT,
  old_job_title TEXT,
  new_job_title TEXT,
  old_role TEXT,
  new_role TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hr_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for hr_records
CREATE POLICY "Tenant members can view hr_records"
  ON public.hr_records FOR SELECT
  USING (is_tenant_member(tenant_id) OR is_sys_super_admin());

CREATE POLICY "Tenant admins can create hr_records"
  ON public.hr_records FOR INSERT
  WITH CHECK (is_tenant_admin(tenant_id) OR is_sys_super_admin());

CREATE POLICY "Tenant admins can update hr_records"
  ON public.hr_records FOR UPDATE
  USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

CREATE POLICY "Tenant admins can delete hr_records"
  ON public.hr_records FOR DELETE
  USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- Trigger for updated_at
CREATE TRIGGER update_hr_records_updated_at
  BEFORE UPDATE ON public.hr_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_hr_records_tenant_id ON public.hr_records(tenant_id);
CREATE INDEX idx_hr_records_user_id ON public.hr_records(user_id);
CREATE INDEX idx_hr_records_effective_date ON public.hr_records(effective_date);

-- Add SELECT policy for profiles within same tenant (for viewing other employees)
CREATE POLICY "Tenant members can view tenant member profiles"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid() 
    OR is_sys_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm1
      JOIN public.tenant_memberships tm2 ON tm1.tenant_id = tm2.tenant_id
      WHERE tm1.user_id = auth.uid() AND tm2.user_id = profiles.id
    )
  );
