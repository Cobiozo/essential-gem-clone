
DROP POLICY IF EXISTS "Dashboard map logos admin insert" ON storage.objects;
DROP POLICY IF EXISTS "Dashboard map logos admin update" ON storage.objects;
DROP POLICY IF EXISTS "Dashboard map logos admin delete" ON storage.objects;

CREATE POLICY "Dashboard map logos auth insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dashboard-map-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Dashboard map logos auth update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'dashboard-map-logos' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'dashboard-map-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Dashboard map logos auth delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'dashboard-map-logos' AND auth.uid() IS NOT NULL);
