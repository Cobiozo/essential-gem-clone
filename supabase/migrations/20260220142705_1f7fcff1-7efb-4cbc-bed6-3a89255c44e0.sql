
DROP FUNCTION IF EXISTS public.get_user_profiles_with_confirmation();

CREATE FUNCTION public.get_user_profiles_with_confirmation()
 RETURNS TABLE(id uuid, email text, role text, first_name text, last_name text, eq_id text, is_active boolean, is_approved boolean, guardian_approved boolean, guardian_approved_at timestamp with time zone, admin_approved_at timestamp with time zone, email_confirmed_at timestamp with time zone, email_activated boolean, email_activated_at timestamp with time zone, last_sign_in_at timestamp with time zone, created_at timestamp with time zone, phone_number text, street_address text, postal_code text, city text, country text, specialization text, profile_description text, upline_first_name text, upline_last_name text, upline_eq_id text, leader_approved boolean, leader_approved_at timestamp with time zone, leader_approver_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
    p.upline_eq_id,
    p.leader_approved,
    p.leader_approved_at,
    p.leader_approver_id
  FROM public.profiles p
  JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
  ORDER BY u.created_at DESC;
END;
$function$;
