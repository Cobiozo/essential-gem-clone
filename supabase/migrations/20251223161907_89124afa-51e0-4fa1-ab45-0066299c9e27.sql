-- Create a function to search for guardians (partners, specjalista, admin) that bypasses RLS
-- This is needed because during registration the user is not authenticated yet
CREATE OR REPLACE FUNCTION public.search_guardians(search_query text)
RETURNS TABLE(
  user_id uuid,
  first_name text,
  last_name text,
  eq_id text,
  email text,
  role text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT 
    p.user_id,
    p.first_name,
    p.last_name,
    p.eq_id,
    p.email,
    ur.role::text
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
  WHERE p.is_active = true
    AND ur.role IN ('partner', 'specjalista', 'admin')
    AND (
      p.first_name ILIKE '%' || search_query || '%'
      OR p.last_name ILIKE '%' || search_query || '%'
      OR p.eq_id ILIKE '%' || search_query || '%'
      OR (p.first_name || ' ' || p.last_name) ILIKE '%' || search_query || '%'
    )
  ORDER BY p.first_name, p.last_name
  LIMIT 15;
$$;