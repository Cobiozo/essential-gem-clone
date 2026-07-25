CREATE OR REPLACE FUNCTION public.get_user_location_points()
 RETURNS TABLE(user_id uuid, first_name text, last_initial text, city text, country text, street text, postal_code text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id AS user_id,
    COALESCE(NULLIF(TRIM(p.first_name), ''), '—') AS first_name,
    CASE
      WHEN p.last_name IS NULL OR TRIM(p.last_name) = '' THEN ''
      ELSE UPPER(LEFT(TRIM(p.last_name), 1)) || '.'
    END AS last_initial,
    INITCAP(LOWER(TRIM(p.city))) AS city,
    COALESCE(
      NULLIF(TRIM(p.country), ''),
      (
        SELECT NULLIF(TRIM(g.country), '')
        FROM public.city_geocache g
        WHERE LOWER(TRIM(g.city)) = LOWER(TRIM(p.city))
          AND COALESCE(NULLIF(TRIM(g.country), ''), '') <> ''
        ORDER BY g.updated_at DESC NULLS LAST
        LIMIT 1
      ),
      ''
    ) AS country,
    COALESCE(NULLIF(TRIM(p.street_address), ''), '') AS street,
    TRIM(p.postal_code) AS postal_code
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.blocked_at IS NULL
    AND COALESCE(p.deletion_status, 'none') IN ('none', '')
    AND COALESCE(TRIM(p.city), '') <> ''
    AND COALESCE(TRIM(p.postal_code), '') <> '';
$function$;