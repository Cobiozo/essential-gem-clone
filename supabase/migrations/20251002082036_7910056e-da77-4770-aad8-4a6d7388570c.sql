-- Update get_user_profiles_with_confirmation to include role from user_roles table
CREATE OR REPLACE FUNCTION public.get_user_profiles_with_confirmation()
RETURNS TABLE(
  id UUID,
  user_id UUID,
  email TEXT,
  role TEXT,
  first_name TEXT,
  last_name TEXT,
  eq_id TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  email_confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmation_sent_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    u.confirmation_sent_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
  ORDER BY p.created_at DESC;
$$;