-- Set allowed MIME types for training-media bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain'
]
WHERE id = 'training-media';

-- Add UPDATE and DELETE policies for authenticated users
DROP POLICY IF EXISTS "Authenticated users can update training media" ON storage.objects;
CREATE POLICY "Authenticated users can update training media"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'training-media' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can delete training media" ON storage.objects;
CREATE POLICY "Authenticated users can delete training media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'training-media' 
  AND auth.role() = 'authenticated'
);