INSERT INTO storage.buckets (id, name, public) VALUES ('landing-images', 'landing-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload landing images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'landing-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own landing images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'landing-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own landing images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'landing-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read landing images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'landing-images');