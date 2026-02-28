
-- Create meeting-backgrounds bucket (public for serving images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-backgrounds', 'meeting-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload their own backgrounds
CREATE POLICY "Users can upload own meeting backgrounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meeting-backgrounds'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Users can view their own backgrounds
CREATE POLICY "Users can view own meeting backgrounds"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-backgrounds'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Users can delete their own backgrounds
CREATE POLICY "Users can delete own meeting backgrounds"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'meeting-backgrounds'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
