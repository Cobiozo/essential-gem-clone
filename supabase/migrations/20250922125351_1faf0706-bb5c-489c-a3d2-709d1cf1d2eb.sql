-- Create storage buckets for Rich Text Editor media uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('cms-images', 'cms-images', true),
  ('cms-videos', 'cms-videos', true),
  ('cms-files', 'cms-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for cms-images bucket
CREATE POLICY "Allow public viewing of cms images" ON storage.objects
FOR SELECT USING (bucket_id = 'cms-images');

CREATE POLICY "Allow authenticated uploads to cms-images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'cms-images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates to cms-images" ON storage.objects
FOR UPDATE USING (bucket_id = 'cms-images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated deletes from cms-images" ON storage.objects
FOR DELETE USING (bucket_id = 'cms-images' AND auth.role() = 'authenticated');

-- Create RLS policies for cms-videos bucket
CREATE POLICY "Allow public viewing of cms videos" ON storage.objects
FOR SELECT USING (bucket_id = 'cms-videos');

CREATE POLICY "Allow authenticated uploads to cms-videos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'cms-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates to cms-videos" ON storage.objects
FOR UPDATE USING (bucket_id = 'cms-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated deletes from cms-videos" ON storage.objects
FOR DELETE USING (bucket_id = 'cms-videos' AND auth.role() = 'authenticated');

-- Create RLS policies for cms-files bucket
CREATE POLICY "Allow authenticated viewing of cms files" ON storage.objects
FOR SELECT USING (bucket_id = 'cms-files' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated uploads to cms-files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'cms-files' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates to cms-files" ON storage.objects
FOR UPDATE USING (bucket_id = 'cms-files' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated deletes from cms-files" ON storage.objects
FOR DELETE USING (bucket_id = 'cms-files' AND auth.role() = 'authenticated');