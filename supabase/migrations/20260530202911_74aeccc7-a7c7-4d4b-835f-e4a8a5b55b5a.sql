CREATE OR REPLACE FUNCTION public.get_payu_public_status()
RETURNS TABLE(is_enabled boolean, last_test_ok boolean, last_test_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT is_enabled, last_test_ok, last_test_at
  FROM public.payu_settings
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_payu_public_status() TO anon, authenticated;