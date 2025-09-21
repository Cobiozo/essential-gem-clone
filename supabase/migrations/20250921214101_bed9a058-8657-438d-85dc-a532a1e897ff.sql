-- Rozszerz constraint dla media_type, aby obsługiwać nowe typy mediów
ALTER TABLE cms_items DROP CONSTRAINT IF EXISTS cms_items_media_type_check;

-- Dodaj nowy constraint z rozszerzonymi typami
ALTER TABLE cms_items ADD CONSTRAINT cms_items_media_type_check 
CHECK (media_type IN ('image', 'video', 'document', 'audio', 'other', ''));

-- Utwórz bucket dla plików (dokumenty, audio, inne)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cms-files', 'cms-files', true)
ON CONFLICT (id) DO NOTHING;

-- Dodaj policies dla bucket cms-files
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'cms-files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow public read access to files" ON storage.objects
FOR SELECT USING (bucket_id = 'cms-files');

CREATE POLICY "Allow authenticated users to update their files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'cms-files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to delete their files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'cms-files' AND
  auth.role() = 'authenticated'
);