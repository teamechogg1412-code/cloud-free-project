-- Create storage bucket for artist assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-assets', 'artist-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload artist assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'artist-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update artist assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'artist-assets' AND auth.role() = 'authenticated');

-- Allow public read access
CREATE POLICY "Public read access for artist assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'artist-assets');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete artist assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'artist-assets' AND auth.role() = 'authenticated');
