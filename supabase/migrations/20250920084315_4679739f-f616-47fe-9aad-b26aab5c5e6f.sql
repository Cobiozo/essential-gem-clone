-- Function to get user profile with email confirmation status
CREATE OR REPLACE FUNCTION public.get_user_profiles_with_confirmation()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  role text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  email_confirmed_at timestamp with time zone,
  confirmation_sent_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.email,
    p.role,
    p.created_at,
    p.updated_at,
    u.email_confirmed_at,
    u.confirmation_sent_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  ORDER BY p.created_at DESC;
$$;

-- Function for admin to confirm user email (bypasses email confirmation)
CREATE OR REPLACE FUNCTION public.admin_confirm_user_email(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Return true if a row was updated (user existed and wasn't already confirmed)
  RETURN FOUND;
END;
$$;