
-- 1. Fix admin_toggle_user_status to also deactivate user_blocks when unblocking
CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(target_user_id uuid, new_status boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
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

  -- When activating (unblocking), deactivate any active user_blocks records
  IF new_status = true THEN
    UPDATE public.user_blocks
    SET is_active = false,
        unblocked_at = now(),
        unblocked_by_user_id = auth.uid()
    WHERE blocked_user_id = target_user_id
      AND is_active = true;
  END IF;
  
  -- Return true if a row was updated
  RETURN FOUND;
END;
$function$;

-- 2. One-time cleanup: deactivate hanging user_blocks where profile is already active
UPDATE public.user_blocks ub
SET is_active = false,
    unblocked_at = COALESCE(ub.unblocked_at, now()),
    unblocked_by_user_id = COALESCE(ub.unblocked_by_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
FROM public.profiles p
WHERE ub.blocked_user_id = p.user_id
  AND ub.is_active = true
  AND p.is_active = true;
