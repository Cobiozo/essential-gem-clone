-- Allow authenticated users to upload to their own folder in certificates bucket
CREATE POLICY "Users can upload own certificates storage"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificates' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own certificates in storage
CREATE POLICY "Users can update own certificates storage"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'certificates' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own certificates in storage
CREATE POLICY "Users can delete own certificates storage"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'certificates' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);