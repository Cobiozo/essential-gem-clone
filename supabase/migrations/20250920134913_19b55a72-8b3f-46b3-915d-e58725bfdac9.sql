-- Update RLS policies for pages to respect role visibility
DROP POLICY "Anyone can view published pages" ON public.pages;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- New policy that checks visibility based on user role
CREATE POLICY "Users can view pages based on role visibility" ON public.pages
FOR SELECT USING (
  is_published = true 
  AND is_active = true 
  AND (
    visible_to_everyone = true
    OR (visible_to_clients = true AND get_current_user_role() = 'client')
    OR (visible_to_partners = true AND get_current_user_role() = 'partner')
    OR (get_current_user_role() = 'admin')
  )
);