-- Nowa funkcja do resetowania wszystkich aktywnych linków (wyłącz/włącz)
CREATE OR REPLACE FUNCTION public.reset_all_active_reflinks()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reset_count integer;
  active_link_ids uuid[];
BEGIN
  -- Sprawdź czy użytkownik jest adminem
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can reset all reflinks';
  END IF;

  -- Pobierz ID wszystkich aktywnych linków
  SELECT array_agg(id) INTO active_link_ids
  FROM user_reflinks
  WHERE is_active = true
    AND expires_at > now();
  
  IF active_link_ids IS NULL OR array_length(active_link_ids, 1) IS NULL THEN
    RETURN json_build_object('reset_count', 0);
  END IF;
  
  reset_count := array_length(active_link_ids, 1);
  
  -- Krok 1: Wyłącz wszystkie
  UPDATE user_reflinks
  SET is_active = false, updated_at = now()
  WHERE id = ANY(active_link_ids);
  
  -- Krok 2: Włącz z powrotem
  UPDATE user_reflinks
  SET is_active = true, updated_at = now()
  WHERE id = ANY(active_link_ids);
  
  RETURN json_build_object('reset_count', reset_count);
END;
$$;