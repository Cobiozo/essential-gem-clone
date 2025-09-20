-- Update RLS policy to treat 'user' role as equivalent to 'client'
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
    -- Allow if user is client/user and page is visible to clients
    OR (visible_to_clients = true AND get_current_user_role() IN ('client', 'user'))
    -- Allow if user is partner and page is visible to partners  
    OR (visible_to_partners = true AND get_current_user_role() = 'partner')
  )
);