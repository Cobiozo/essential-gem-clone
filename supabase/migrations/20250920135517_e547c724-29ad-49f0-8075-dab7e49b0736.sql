-- Test function to debug role checking
CREATE OR REPLACE FUNCTION public.debug_user_access()
RETURNS TABLE(
  current_user_id uuid,
  current_role text,
  has_profile boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    p.role as current_role,
    (p.id IS NOT NULL) as has_profile
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the get_current_user_role function to handle null cases better
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  RETURN COALESCE(user_role, 'anonymous');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update RLS policy to be more explicit
DROP POLICY IF EXISTS "Users can view pages based on role visibility" ON public.pages;

CREATE POLICY "Users can view pages based on role visibility" ON public.pages
FOR SELECT USING (
  is_published = true 
  AND is_active = true 
  AND (
    -- Always allow admins
    get_current_user_role() = 'admin'
    -- Allow if page is visible to everyone
    OR visible_to_everyone = true
    -- Allow if user is client and page is visible to clients
    OR (visible_to_clients = true AND get_current_user_role() = 'client')
    -- Allow if user is partner and page is visible to partners  
    OR (visible_to_partners = true AND get_current_user_role() = 'partner')
  )
);