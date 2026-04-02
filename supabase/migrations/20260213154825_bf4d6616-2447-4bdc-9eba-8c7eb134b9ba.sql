
-- Drop existing overly permissive storage policies for artist-assets
DROP POLICY IF EXISTS "Authenticated users can upload artist assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update artist assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete artist assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for artist assets" ON storage.objects;

-- Tenant-scoped upload: only members can upload to their tenant's folder
CREATE POLICY "Tenant members can upload artist assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artist-assets'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.tenant_memberships
    WHERE user_id = auth.uid()
  )
);

-- Tenant-scoped update: only members can update their tenant's files
CREATE POLICY "Tenant members can update artist assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'artist-assets'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.tenant_memberships
    WHERE user_id = auth.uid()
  )
);

-- Tenant-scoped delete: only admins/managers can delete their tenant's files
CREATE POLICY "Tenant admins can delete artist assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'artist-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT tm.tenant_id::text
    FROM public.tenant_memberships tm
    WHERE tm.user_id = auth.uid()
    AND tm.role IN ('company_admin', 'manager')
  )
);

-- Keep public read access for portfolio images
CREATE POLICY "Public read access for artist assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'artist-assets');
