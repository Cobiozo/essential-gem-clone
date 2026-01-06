-- Update admin_confirm_user_email function to also update profiles.email_activated
CREATE OR REPLACE FUNCTION public.admin_confirm_user_email(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_updated boolean := false;
BEGIN
  -- Check if the caller is an admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can confirm user emails';
  END IF;
  
  -- Update the user's email_confirmed_at in auth.users
  UPDATE auth.users 
  SET email_confirmed_at = NOW()
  WHERE id = target_user_id 
  AND email_confirmed_at IS NULL;
  
  -- Also update profiles.email_activated
  UPDATE public.profiles
  SET email_activated = true, email_activated_at = NOW()
  WHERE user_id = target_user_id
  AND (email_activated = false OR email_activated IS NULL);
  
  was_updated := FOUND;
  RETURN was_updated;
END;
$$;