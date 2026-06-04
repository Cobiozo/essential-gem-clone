CREATE OR REPLACE FUNCTION public.sync_profile_role_from_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Moderator is an additional CMS permission role stored only in user_roles
  -- and moderator_permissions. Do not mirror it into profiles.role because
  -- profiles.role is a legacy/base-role column with a narrower constraint.
  IF NEW.role = 'moderator'::public.app_role THEN
    RETURN NEW;
  END IF;

  -- Temporarily disable legacy profile role protection triggers while syncing
  -- supported base roles from user_roles to profiles.role.
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
$$;