ALTER TABLE public.dashboard_map_settings
  ADD COLUMN IF NOT EXISTS logo_left_url TEXT DEFAULT 'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/logo-1772644418932.png',
  ADD COLUMN IF NOT EXISTS logo_right_url TEXT DEFAULT '/lovable-uploads/eqology-ibp-logo.png';

INSERT INTO storage.buckets (id, name, public)
VALUES ('dashboard-map-logos', 'dashboard-map-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Dashboard map logos public read" ON storage.objects;
CREATE POLICY "Dashboard map logos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'dashboard-map-logos');

DROP POLICY IF EXISTS "Dashboard map logos admin insert" ON storage.objects;
CREATE POLICY "Dashboard map logos admin insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dashboard-map-logos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Dashboard map logos admin update" ON storage.objects;
CREATE POLICY "Dashboard map logos admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'dashboard-map-logos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Dashboard map logos admin delete" ON storage.objects;
CREATE POLICY "Dashboard map logos admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'dashboard-map-logos' AND public.has_role(auth.uid(), 'admin'));