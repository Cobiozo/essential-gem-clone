-- Admin-only helper to update a user's role safely
CREATE OR REPLACE FUNCTION public.admin_update_user_role(target_user_id uuid, target_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_role_lower text := lower(target_role);
BEGIN
  -- Ensure only admins can call this
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can modify user roles';
  END IF;

  -- Validate role
  IF new_role_lower NOT IN ('user','client','admin','partner') THEN
    RAISE EXCEPTION 'Invalid role: %', target_role;
  END IF;

  -- Apply update
  UPDATE public.profiles
     SET role = new_role_lower,
         updated_at = now()
   WHERE user_id = target_user_id;

  RETURN FOUND;
END;
$$;