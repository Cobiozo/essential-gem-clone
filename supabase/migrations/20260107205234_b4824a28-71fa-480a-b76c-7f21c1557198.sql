-- 1. Rozszerzenie funkcji synchronizacji o pole role
CREATE OR REPLACE FUNCTION public.sync_user_in_team_contacts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update data in all contacts linked to this user (including role!)
  UPDATE public.team_contacts SET
    first_name = NEW.first_name,
    last_name = NEW.last_name,
    eq_id = NEW.eq_id,
    email = NEW.email,
    phone_number = NEW.phone_number,
    role = NEW.role
  WHERE linked_user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- 2. Usunięcie starego triggera i utworzenie nowego z warunkiem dla role
DROP TRIGGER IF EXISTS on_profile_update_sync_contacts ON public.profiles;

CREATE TRIGGER on_profile_update_sync_contacts
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.first_name IS DISTINCT FROM NEW.first_name OR
    OLD.last_name IS DISTINCT FROM NEW.last_name OR
    OLD.eq_id IS DISTINCT FROM NEW.eq_id OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone_number IS DISTINCT FROM NEW.phone_number OR
    OLD.role IS DISTINCT FROM NEW.role
  )
  EXECUTE FUNCTION public.sync_user_in_team_contacts();

-- 3. Jednorazowa korekta - synchronizacja ról w team_contacts z profiles
UPDATE public.team_contacts tc
SET role = p.role
FROM public.profiles p
WHERE tc.linked_user_id = p.user_id
  AND tc.contact_type = 'team_member'
  AND tc.role IS DISTINCT FROM p.role;

-- 4. Dodanie kolumny linked_user_deleted_at jeśli nie istnieje
ALTER TABLE public.team_contacts 
ADD COLUMN IF NOT EXISTS linked_user_deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 5. Oznaczenie osieroconych wpisów (usuniętych użytkowników)
UPDATE public.team_contacts tc
SET linked_user_deleted_at = NOW()
WHERE tc.linked_user_id IS NOT NULL
  AND tc.contact_type = 'team_member'
  AND tc.linked_user_deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = tc.linked_user_id
  );