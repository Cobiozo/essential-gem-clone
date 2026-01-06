CREATE OR REPLACE FUNCTION public.get_user_profiles_with_confirmation()
 RETURNS TABLE(id uuid, email text, role text, first_name text, last_name text, eq_id text, is_active boolean, is_approved boolean, guardian_approved boolean, email_confirmed_at timestamp with time zone, created_at timestamp with time zone, phone_number text, street_address text, postal_code text, city text, country text, specialization text, profile_description text, upline_first_name text, upline_last_name text, upline_eq_id text)
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
    u.email_confirmed_at,
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