-- Funkcja bezpiecznego inkrementowania kliknięć reflinków dla anonimowych użytkowników
CREATE OR REPLACE FUNCTION public.increment_reflink_click(reflink_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_reflinks
  SET 
    click_count = click_count + 1,
    updated_at = now()
  WHERE id = reflink_id_param
    AND is_active = true
    AND expires_at > now();
END;
$$;

-- Pozwól wszystkim (w tym anonimowym) wywoływać tę funkcję
GRANT EXECUTE ON FUNCTION public.increment_reflink_click(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_reflink_click(uuid) TO authenticated;