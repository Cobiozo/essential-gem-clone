-- Drop the existing function and recreate it with first_name and last_name
DROP FUNCTION public.get_user_profiles_with_confirmation();

CREATE OR REPLACE FUNCTION public.get_user_profiles_with_confirmation()
 RETURNS TABLE(id uuid, user_id uuid, email text, role text, first_name text, last_name text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, email_confirmed_at timestamp with time zone, confirmation_sent_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.user_id,
    p.email,
    p.role,
    p.first_name,
    p.last_name,
    p.is_active,
    p.created_at,
    p.updated_at,
    u.email_confirmed_at,
    u.confirmation_sent_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  ORDER BY p.created_at DESC;
$function$;