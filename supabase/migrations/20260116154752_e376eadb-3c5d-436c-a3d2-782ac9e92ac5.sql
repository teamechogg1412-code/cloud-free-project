-- Add Google Drive integration fields to tenants table
-- google_credentials stores the encrypted service account JSON key
-- drive_folder_id stores the target folder ID for file uploads

ALTER TABLE public.tenants
ADD COLUMN google_credentials text,
ADD COLUMN drive_folder_id text,
ADD COLUMN drive_connected_at timestamptz,
ADD COLUMN drive_connected_by uuid REFERENCES public.profiles(id);

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.google_credentials IS 'Encrypted Google service account JSON key';
COMMENT ON COLUMN public.tenants.drive_folder_id IS 'Google Drive folder ID for file storage';
COMMENT ON COLUMN public.tenants.drive_connected_at IS 'When Google Drive was connected';
COMMENT ON COLUMN public.tenants.drive_connected_by IS 'Who connected Google Drive';