
-- 기능별 Google Drive 폴더 매핑 테이블
CREATE TABLE public.drive_folder_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  folder_key TEXT NOT NULL,          -- 예: 'bank_transactions', 'card_receipts', 'hr_documents'
  folder_id TEXT NOT NULL,           -- Google Drive 폴더 ID
  folder_name TEXT,                  -- 표시용 폴더 이름
  folder_path TEXT,                  -- 표시용 경로 (예: '재무/은행내역')
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, folder_key)
);

-- Enable RLS
ALTER TABLE public.drive_folder_mappings ENABLE ROW LEVEL SECURITY;

-- Tenant admins can manage
CREATE POLICY "Tenant admins can manage drive_folder_mappings"
ON public.drive_folder_mappings
FOR ALL
USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- Tenant members can view
CREATE POLICY "Tenant members can view drive_folder_mappings"
ON public.drive_folder_mappings
FOR SELECT
USING (is_tenant_member(tenant_id) OR is_sys_super_admin());

-- Trigger for updated_at
CREATE TRIGGER update_drive_folder_mappings_updated_at
BEFORE UPDATE ON public.drive_folder_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
