-- Function for guardian to reject a user registration
CREATE OR REPLACE FUNCTION public.guardian_reject_user(
  target_user_id uuid,
  rejection_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guardian_eq_id text;
  target_upline_eq_id text;
  target_first_name text;
  target_last_name text;
  target_email text;
BEGIN
  -- Get current user's EQ ID
  SELECT eq_id INTO guardian_eq_id
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Get target user's upline EQ ID and info
  SELECT upline_eq_id, first_name, last_name, email 
  INTO target_upline_eq_id, target_first_name, target_last_name, target_email
  FROM public.profiles
  WHERE user_id = target_user_id;
  
  -- Check if the current user is the guardian of the target user
  IF guardian_eq_id IS NULL OR target_upline_eq_id IS NULL OR guardian_eq_id != target_upline_eq_id THEN
    RAISE EXCEPTION 'Access denied: You are not the guardian of this user';
  END IF;
  
  -- Check if already approved by guardian (can't reject after approval)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id AND guardian_approved = TRUE) THEN
    RAISE EXCEPTION 'Cannot reject: User is already approved by guardian';
  END IF;
  
  -- Deactivate the user's profile
  UPDATE public.profiles
  SET is_active = FALSE,
      updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Remove user from team_contacts of the guardian
  UPDATE public.team_contacts
  SET is_active = FALSE,
      notes = COALESCE(notes || E'\n', '') || 'Odrzucony przez opiekuna: ' || COALESCE(rejection_reason, 'brak podanego powodu')
  WHERE linked_user_id = target_user_id
    AND user_id = auth.uid();
  
  -- Send notification to the rejected user
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
    'Rejestracja odrzucona',
    CASE 
      WHEN rejection_reason IS NOT NULL AND rejection_reason != '' 
      THEN format('Twoja rejestracja została odrzucona przez opiekuna. Powód: %s', rejection_reason)
      ELSE 'Twoja rejestracja została odrzucona przez opiekuna. Skontaktuj się z nim, aby uzyskać więcej informacji.'
    END,
    jsonb_build_object('guardian_approved', false, 'rejected', true, 'rejection_reason', rejection_reason)
  );
  
  -- Notify admins about the rejection
  INSERT INTO public.user_notifications (
    user_id,
    notification_type,
    source_module,
    title,
    message,
    metadata
  )
  SELECT 
    ur.user_id,
    'approval_status',
    'registration',
    'Opiekun odrzucił rejestrację',
    format('Opiekun odrzucił rejestrację użytkownika %s %s (%s).', target_first_name, target_last_name, target_email),
    jsonb_build_object('target_user_id', target_user_id, 'guardian_id', auth.uid(), 'rejection_reason', rejection_reason)
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  
  RETURN TRUE;
END;
$$;