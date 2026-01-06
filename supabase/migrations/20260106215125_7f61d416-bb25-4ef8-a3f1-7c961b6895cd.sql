-- Drop and recreate the function with additional profile fields
DROP FUNCTION IF EXISTS public.get_user_profiles_with_confirmation();

CREATE OR REPLACE FUNCTION public.get_user_profiles_with_confirmation()
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  first_name text,
  last_name text,
  eq_id text,
  is_active boolean,
  is_approved boolean,
  guardian_approved boolean,
  email_confirmed_at timestamptz,
  created_at timestamptz,
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
SET search_path = public
AS $$
BEGIN
  -- Check if the calling user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    u.email::text,
    p.role::text,
    p.first_name,
    p.last_name,
    p.eq_id,
    p.is_active,
    p.is_approved,
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
    upline.first_name AS upline_first_name,
    upline.last_name AS upline_last_name,
    upline.eq_id AS upline_eq_id
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  LEFT JOIN profiles upline ON p.upline_id = upline.id
  ORDER BY u.created_at DESC;
END;
$$;