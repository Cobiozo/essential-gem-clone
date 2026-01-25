-- Make healthy-knowledge bucket public for thumbnails
UPDATE storage.buckets 
SET public = true 
WHERE id = 'healthy-knowledge';

-- Allow public read access
CREATE POLICY "Public read access for healthy-knowledge"
ON storage.objects FOR SELECT
USING (bucket_id = 'healthy-knowledge');

-- Allow authenticated admin upload
CREATE POLICY "Admin can upload to healthy-knowledge"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'healthy-knowledge' 
  AND auth.role() = 'authenticated'
  AND (SELECT is_admin())
);

-- Allow authenticated admin delete
CREATE POLICY "Admin can delete from healthy-knowledge"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'healthy-knowledge' 
  AND auth.role() = 'authenticated'
  AND (SELECT is_admin())
);