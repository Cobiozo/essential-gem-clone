-- Add missing UPDATE policy for healthy-knowledge storage bucket
-- This is required because the thumbnail upload uses upsert: true option

CREATE POLICY "Admins can update healthy-knowledge files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'healthy-knowledge' 
  AND (SELECT public.is_admin())
)
WITH CHECK (
  bucket_id = 'healthy-knowledge' 
  AND (SELECT public.is_admin())
);