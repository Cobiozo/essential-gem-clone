
CREATE OR REPLACE FUNCTION public.get_user_city_counts()
RETURNS TABLE(city text, country text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT 
    INITCAP(LOWER(TRIM(COALESCE(p.city, 'Nieznane')))) AS city,
    COALESCE(NULLIF(TRIM(p.country), ''), 'Nieznane') AS country,
    COUNT(*)::bigint AS count
  FROM public.profiles p
  WHERE p.city IS NOT NULL AND TRIM(p.city) <> ''
  GROUP BY 1, 2
  ORDER BY count DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_city_counts() TO authenticated;
