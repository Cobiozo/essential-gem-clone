-- Create function to toggle user active status (admin only)
CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(target_user_id uuid, new_status boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if the caller is an admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can modify user status';
  END IF;
  
  -- Prevent admins from deactivating themselves
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own active status';
  END IF;
  
  -- Update the user's active status
  UPDATE public.profiles 
  SET is_active = new_status, updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Return true if a row was updated
  RETURN FOUND;
END;
$$;

-- Drop and recreate the get_user_profiles_with_confirmation function to include is_active
DROP FUNCTION IF EXISTS public.get_user_profiles_with_confirmation();

CREATE OR REPLACE FUNCTION public.get_user_profiles_with_confirmation()
RETURNS TABLE(id uuid, user_id uuid, email text, role text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, email_confirmed_at timestamp with time zone, confirmation_sent_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.email,
    p.role,
    p.is_active,
    p.created_at,
    p.updated_at,
    u.email_confirmed_at,
    u.confirmation_sent_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  ORDER BY p.created_at DESC;
$$;