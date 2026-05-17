
-- 1) Default map mode -> satellite
ALTER TABLE public.dashboard_map_settings
  ALTER COLUMN default_mode SET DEFAULT 'satellite';

UPDATE public.dashboard_map_settings
  SET default_mode = 'satellite'
  WHERE default_mode = 'classic';

-- 2) Reinforce permissive storage policies for dashboard-map-logos bucket
DROP POLICY IF EXISTS "Dashboard map logos admin insert" ON storage.objects;
DROP POLICY IF EXISTS "Dashboard map logos admin update" ON storage.objects;
DROP POLICY IF EXISTS "Dashboard map logos admin delete" ON storage.objects;
DROP POLICY IF EXISTS "Dashboard map logos auth insert" ON storage.objects;
DROP POLICY IF EXISTS "Dashboard map logos auth update" ON storage.objects;
DROP POLICY IF EXISTS "Dashboard map logos auth delete" ON storage.objects;
DROP POLICY IF EXISTS "Dashboard map logos public read" ON storage.objects;

CREATE POLICY "Dashboard map logos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'dashboard-map-logos');

CREATE POLICY "Dashboard map logos auth insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dashboard-map-logos');

CREATE POLICY "Dashboard map logos auth update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'dashboard-map-logos')
WITH CHECK (bucket_id = 'dashboard-map-logos');

CREATE POLICY "Dashboard map logos auth delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'dashboard-map-logos');
