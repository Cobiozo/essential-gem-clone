-- Utwardzenie triggera: pomiń użytkowników bez profilu, żeby osierocone konto nie blokowało włączania modułów
CREATE OR REPLACE FUNCTION public.assign_training_module_to_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_active = true THEN
    INSERT INTO training_assignments (user_id, module_id, assigned_by, notification_sent)
    SELECT ur.user_id, NEW.id, NULL, false
    FROM user_roles ur
    WHERE ur.role <> 'guest'
      AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = ur.user_id)
      AND (
        (ur.role = 'partner' AND NEW.visible_to_partners = true) OR
        (ur.role = 'specjalista' AND NEW.visible_to_specjalista = true) OR
        (ur.role IN ('client', 'user') AND NEW.visible_to_clients = true) OR
        (ur.role = 'admin') OR
        NEW.visible_to_everyone = true
      )
    ON CONFLICT (user_id, module_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;