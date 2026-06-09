CREATE OR REPLACE FUNCTION public.sync_profile_role_from_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Moderator is an additive CMS permission, not a base role.
  -- Guest is a restricted external role that must NOT be mirrored into the
  -- legacy profiles.role column (which has a narrower CHECK constraint).
  IF NEW.role = 'moderator'::public.app_role OR NEW.role = 'guest'::public.app_role THEN
    RETURN NEW;
  END IF;

  ALTER TABLE public.profiles DISABLE TRIGGER prevent_role_escalation_trigger;
  ALTER TABLE public.profiles DISABLE TRIGGER validate_role_change_trigger;

  UPDATE public.profiles
  SET role = NEW.role::text, updated_at = now()
  WHERE user_id = NEW.user_id;

  ALTER TABLE public.profiles ENABLE TRIGGER prevent_role_escalation_trigger;
  ALTER TABLE public.profiles ENABLE TRIGGER validate_role_change_trigger;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    ALTER TABLE public.profiles ENABLE TRIGGER prevent_role_escalation_trigger;
    ALTER TABLE public.profiles ENABLE TRIGGER validate_role_change_trigger;
    RAISE;
END;
$function$;

-- Extend profiles.role CHECK to allow 'guest' so guest profiles can store the role explicitly.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS valid_role_values;
ALTER TABLE public.profiles ADD CONSTRAINT valid_role_values
  CHECK (lower(role) = ANY (ARRAY['user'::text, 'client'::text, 'admin'::text, 'partner'::text, 'specjalista'::text, 'guest'::text]));