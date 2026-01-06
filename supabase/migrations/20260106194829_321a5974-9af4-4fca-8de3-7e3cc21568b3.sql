-- Dodaj pole email_activated do tabeli profiles (jeśli nie istnieje)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_activated BOOLEAN DEFAULT FALSE;

-- Dodaj pole email_activated_at (jeśli nie istnieje)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_activated_at TIMESTAMP WITH TIME ZONE;

-- Najpierw usuń istniejącą funkcję
DROP FUNCTION IF EXISTS public.get_user_profiles_with_confirmation();

-- Utwórz funkcję z nowymi polami
CREATE FUNCTION public.get_user_profiles_with_confirmation()
 RETURNS TABLE(
   id uuid, 
   user_id uuid, 
   email text, 
   role text, 
   first_name text, 
   last_name text, 
   eq_id text, 
   is_active boolean, 
   created_at timestamp with time zone, 
   updated_at timestamp with time zone, 
   email_confirmed_at timestamp with time zone, 
   confirmation_sent_at timestamp with time zone, 
   guardian_approved boolean, 
   guardian_approved_at timestamp with time zone, 
   admin_approved boolean, 
   admin_approved_at timestamp with time zone, 
   upline_eq_id text, 
   guardian_name text,
   email_activated boolean,
   email_activated_at timestamp with time zone
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.user_id,
    p.email,
    COALESCE(ur.role::text, 'client') as role,
    p.first_name,
    p.last_name,
    p.eq_id,
    p.is_active,
    p.created_at,
    p.updated_at,
    u.email_confirmed_at,
    u.confirmation_sent_at,
    p.guardian_approved,
    p.guardian_approved_at,
    p.admin_approved,
    p.admin_approved_at,
    p.upline_eq_id,
    p.guardian_name,
    COALESCE(p.email_activated, false) as email_activated,
    p.email_activated_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
  ORDER BY p.created_at DESC;
$function$;