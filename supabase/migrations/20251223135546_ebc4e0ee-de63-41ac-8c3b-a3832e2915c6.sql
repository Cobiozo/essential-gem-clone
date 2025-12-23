-- Update admin_approve_user function to allow bypassing guardian approval
CREATE OR REPLACE FUNCTION public.admin_approve_user(target_user_id uuid, bypass_guardian boolean DEFAULT false)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_guardian_approved boolean;
  target_first_name text;
  target_last_name text;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can approve users';
  END IF;
  
  -- Get target user info
  SELECT guardian_approved, first_name, last_name 
  INTO target_guardian_approved, target_first_name, target_last_name
  FROM public.profiles
  WHERE user_id = target_user_id;
  
  -- Check if guardian has approved first (unless bypassing)
  IF NOT bypass_guardian AND (target_guardian_approved IS NULL OR target_guardian_approved = FALSE) THEN
    RAISE EXCEPTION 'User must be approved by guardian first. Use bypass_guardian=true to skip guardian approval.';
  END IF;
  
  -- Check if already approved by admin
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id AND admin_approved = TRUE) THEN
    RAISE EXCEPTION 'User is already approved by admin';
  END IF;
  
  -- If bypassing guardian, also set guardian_approved to true
  IF bypass_guardian AND (target_guardian_approved IS NULL OR target_guardian_approved = FALSE) THEN
    UPDATE public.profiles
    SET guardian_approved = TRUE,
        guardian_approved_at = NOW(),
        admin_approved = TRUE,
        admin_approved_at = NOW(),
        updated_at = NOW()
    WHERE user_id = target_user_id;
  ELSE
    -- Normal flow - guardian already approved
    UPDATE public.profiles
    SET admin_approved = TRUE,
        admin_approved_at = NOW(),
        updated_at = NOW()
    WHERE user_id = target_user_id;
  END IF;
  
  -- Send notification to the user
  INSERT INTO public.user_notifications (
    user_id,
    notification_type,
    source_module,
    title,
    message,
    metadata
  )
  VALUES (
    target_user_id,
    'approval_status',
    'registration',
    'Twoje konto zostało w pełni zatwierdzone!',
    'Administrator zatwierdził Twoje konto. Możesz teraz w pełni korzystać z systemu. Witamy!',
    jsonb_build_object('guardian_approved', true, 'admin_approved', true, 'bypass_used', bypass_guardian)
  );
  
  RETURN TRUE;
END;
$$;