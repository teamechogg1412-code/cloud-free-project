-- Make artist-assets bucket private to prevent unauthenticated access
UPDATE storage.buckets 
SET public = false 
WHERE id = 'artist-assets';