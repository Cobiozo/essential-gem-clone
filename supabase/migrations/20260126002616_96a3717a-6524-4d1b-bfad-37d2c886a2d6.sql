-- Uproszczenie polityk RLS dla healthy-knowledge bucket
DROP POLICY IF EXISTS "Admin can upload to healthy-knowledge" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete from healthy-knowledge" ON storage.objects;
DROP POLICY IF EXISTS "Admin and Partner can upload to healthy-knowledge" ON storage.objects;
DROP POLICY IF EXISTS "Admin and Partner can delete from healthy-knowledge" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload to healthy-knowledge" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete from healthy-knowledge" ON storage.objects;

CREATE POLICY "Admins can upload to healthy-knowledge"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'healthy-knowledge' 
  AND (SELECT is_admin())
);

CREATE POLICY "Admins can delete from healthy-knowledge"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'healthy-knowledge' 
  AND (SELECT is_admin())
);