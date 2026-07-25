DROP FUNCTION IF EXISTS public.get_user_location_points();

CREATE OR REPLACE FUNCTION public.get_user_location_points()
RETURNS TABLE(
  user_id uuid,
  first_name text,
  last_initial text,
  city text,
  country text,
  street text,
  postal_code text
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
    COALESCE(NULLIF(TRIM(p.street_address), ''), '') AS street,
    COALESCE(NULLIF(TRIM(p.postal_code), ''), '') AS postal_code
  FROM public.profiles p
  WHERE p.city IS NOT NULL
    AND TRIM(p.city) <> ''
    AND public.has_role(auth.uid(), 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.get_user_location_points() TO authenticated;