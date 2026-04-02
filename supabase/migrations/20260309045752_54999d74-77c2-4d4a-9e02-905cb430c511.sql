
-- Create tenant-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to tenant-assets
CREATE POLICY "Authenticated users can upload tenant assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tenant-assets');

-- Allow public read access
CREATE POLICY "Public read access for tenant assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tenant-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update tenant assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tenant-assets');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete tenant assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tenant-assets');
