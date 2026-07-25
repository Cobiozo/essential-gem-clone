
-- 1. Add street column to city_geocache
ALTER TABLE public.city_geocache ADD COLUMN IF NOT EXISTS street text NOT NULL DEFAULT '';
ALTER TABLE public.city_geocache DROP CONSTRAINT IF EXISTS city_geocache_city_country_key;
CREATE UNIQUE INDEX IF NOT EXISTS city_geocache_street_city_country_key ON public.city_geocache (street, city, country);

-- 2. Admin-only RPC returning per-user location points with privacy-safe name
CREATE OR REPLACE FUNCTION public.get_user_location_points()
RETURNS TABLE(
  user_id uuid,
  first_name text,
  last_initial text,
  city text,
  country text,
  street text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    p.id AS user_id,
    COALESCE(NULLIF(TRIM(p.first_name), ''), '—') AS first_name,
    CASE
      WHEN p.last_name IS NULL OR TRIM(p.last_name) = '' THEN ''
      ELSE UPPER(LEFT(TRIM(p.last_name), 1)) || '.'
    END AS last_initial,
    INITCAP(LOWER(TRIM(p.city))) AS city,
    COALESCE(NULLIF(TRIM(p.country), ''), 'Nieznane') AS country,
    COALESCE(NULLIF(TRIM(p.street_address), ''), '') AS street
  FROM public.profiles p
  WHERE p.city IS NOT NULL
    AND TRIM(p.city) <> ''
    AND public.has_role(auth.uid(), 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.get_user_location_points() TO authenticated;
