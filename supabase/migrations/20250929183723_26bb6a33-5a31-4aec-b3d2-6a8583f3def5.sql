-- Add SELECT policy for training-media bucket (it's public, so everyone should be able to view)
DROP POLICY IF EXISTS "Anyone can view training media" ON storage.objects;
CREATE POLICY "Anyone can view training media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'training-media');

-- Make sure authenticated users can also upload to training-media (not just admins)
DROP POLICY IF EXISTS "Authenticated users can upload training media" ON storage.objects;
CREATE POLICY "Authenticated users can upload training media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'training-media' 
  AND auth.role() = 'authenticated'
);