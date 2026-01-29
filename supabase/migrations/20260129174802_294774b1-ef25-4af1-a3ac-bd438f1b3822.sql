-- Funkcja do odświeżania wszystkich aktywnych purelinków (tylko dla adminów)
CREATE OR REPLACE FUNCTION public.refresh_all_active_reflinks()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Sprawdź czy użytkownik jest adminem
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can refresh all reflinks';
  END IF;

  -- Zaktualizuj updated_at dla wszystkich aktywnych linków
  UPDATE user_reflinks
  SET updated_at = now()
  WHERE is_active = true
    AND expires_at > now();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN json_build_object('updated_count', updated_count);
END;
$$;