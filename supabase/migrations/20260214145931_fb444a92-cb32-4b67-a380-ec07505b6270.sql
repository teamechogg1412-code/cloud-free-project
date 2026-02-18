-- Allow authenticated users to upload their own signature
CREATE POLICY "Users can upload own signature"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artist-assets'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'signatures'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to update their own signature
CREATE POLICY "Users can update own signature"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'artist-assets'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'signatures'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to delete their own signature
CREATE POLICY "Users can delete own signature"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'artist-assets'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'signatures'
  AND (storage.foldername(name))[2] = auth.uid()::text
);