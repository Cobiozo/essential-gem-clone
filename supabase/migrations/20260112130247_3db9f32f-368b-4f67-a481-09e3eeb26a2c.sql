-- 1. Update guardian_approve_user function to require email confirmation first
CREATE OR REPLACE FUNCTION public.guardian_approve_user(target_user_id uuid)
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
  target_email_activated boolean;
BEGIN
  -- Get current user's EQ ID
  SELECT eq_id INTO guardian_eq_id
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Get target user's upline EQ ID, name, and email activation status
  SELECT upline_eq_id, first_name, last_name, email_activated 
  INTO target_upline_eq_id, target_first_name, target_last_name, target_email_activated
  FROM public.profiles
  WHERE user_id = target_user_id;
  
  -- Check if the current user is the guardian of the target user
  IF guardian_eq_id IS NULL OR target_upline_eq_id IS NULL OR guardian_eq_id != target_upline_eq_id THEN
    RAISE EXCEPTION 'Access denied: You are not the guardian of this user';
  END IF;
  
  -- Check if email is activated (NEW VALIDATION)
  IF target_email_activated IS NOT TRUE THEN
    RAISE EXCEPTION 'Cannot approve user: email not confirmed yet. User must confirm their email before guardian approval.';
  END IF;
  
  -- Check if already approved by guardian
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id AND guardian_approved = TRUE) THEN
    RAISE EXCEPTION 'User is already approved by guardian';
  END IF;
  
  -- Update the profile
  UPDATE public.profiles
  SET guardian_approved = TRUE,
      guardian_approved_at = NOW(),
      updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Send notification to all admins about new user awaiting admin approval
  INSERT INTO public.user_notifications (
    user_id,
    notification_type,
    source_module,
    title,
    message,
    link,
    metadata
  )
  SELECT 
    ur.user_id,
    'approval_request',
    'registration',
    'Nowy użytkownik oczekuje na zatwierdzenie',
    format('Użytkownik %s %s został zatwierdzony przez opiekuna i oczekuje na Twoje zatwierdzenie.', target_first_name, target_last_name),
    '/admin?tab=users',
    jsonb_build_object('target_user_id', target_user_id, 'guardian_id', auth.uid())
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  
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
    'Opiekun zatwierdził Twoją rejestrację!',
    'Twój opiekun zatwierdził Twoją rejestrację. Teraz oczekujesz na zatwierdzenie przez Administratora.',
    jsonb_build_object('guardian_approved', true, 'admin_approved', false)
  );
  
  RETURN TRUE;
END;
$$;

-- 2. Update get_user_profiles_with_confirmation to include last_sign_in_at, email_activated, and all approval dates
DROP FUNCTION IF EXISTS public.get_user_profiles_with_confirmation();

CREATE FUNCTION public.get_user_profiles_with_confirmation()
RETURNS TABLE(
  id uuid, 
  email text, 
  role text, 
  first_name text, 
  last_name text, 
  eq_id text, 
  is_active boolean, 
  is_approved boolean, 
  guardian_approved boolean,
  guardian_approved_at timestamp with time zone,
  admin_approved_at timestamp with time zone,
  email_confirmed_at timestamp with time zone, 
  email_activated boolean,
  email_activated_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  created_at timestamp with time zone, 
  phone_number text, 
  street_address text, 
  postal_code text, 
  city text, 
  country text, 
  specialization text, 
  profile_description text, 
  upline_first_name text, 
  upline_last_name text, 
  upline_eq_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if the calling user is an admin using user_roles table
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id as id,
    p.email::text,
    ur.role::text,
    p.first_name,
    p.last_name,
    p.eq_id,
    p.is_active,
    p.admin_approved as is_approved,
    p.guardian_approved,
    p.guardian_approved_at,
    p.admin_approved_at,
    u.email_confirmed_at,
    p.email_activated,
    p.email_activated_at,
    u.last_sign_in_at,
    u.created_at,
    p.phone_number,
    p.street_address,
    p.postal_code,
    p.city,
    p.country,
    p.specialization,
    p.profile_description,
    p.upline_first_name,
    p.upline_last_name,
    p.upline_eq_id
  FROM public.profiles p
  JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
  ORDER BY u.created_at DESC;
END;
$function$;