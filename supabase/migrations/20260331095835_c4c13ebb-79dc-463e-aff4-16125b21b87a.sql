
CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(target_user_id uuid, new_status boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can modify user status';
  END IF;
  
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own active status';
  END IF;
  
  -- Update the user's active status
  UPDATE public.profiles 
  SET is_active = new_status, 
      updated_at = NOW(),
      -- When unblocking, clear inactivity block fields and reset last_seen_at
      blocked_at = CASE WHEN new_status = true THEN NULL ELSE blocked_at END,
      block_reason = CASE WHEN new_status = true THEN NULL ELSE block_reason END,
      last_seen_at = CASE WHEN new_status = true THEN NOW() ELSE last_seen_at END,
      inactivity_warning_sent_at = CASE WHEN new_status = true THEN NULL ELSE inactivity_warning_sent_at END
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
  
  RETURN FOUND;
END;
$function$;
