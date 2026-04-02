
CREATE TABLE public.work_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'script',
  drive_file_id text,
  drive_view_link text,
  drive_download_link text,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.work_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage work_files"
ON public.work_files
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
