-- Create a debug function (safe names) to check current user's role
CREATE OR REPLACE FUNCTION public.debug_user_access()
RETURNS TABLE(
  current_user_id uuid,
  user_role text,
  has_profile boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    p.role as user_role,
    (p.id IS NOT NULL) as has_profile
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure get_current_user_role handles no-profile case
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  r TEXT;
BEGIN
  SELECT role INTO r FROM public.profiles WHERE user_id = auth.uid();
  RETURN COALESCE(r, 'anonymous');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;