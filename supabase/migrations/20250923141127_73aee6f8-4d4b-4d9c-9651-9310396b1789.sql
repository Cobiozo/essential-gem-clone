-- Fix RLS policy for cms_sections to allow deactivation
DROP POLICY IF EXISTS "Admins can update CMS sections" ON public.cms_sections;

CREATE POLICY "Admins can update CMS sections" 
ON public.cms_sections 
FOR UPDATE 
USING (is_admin())
WITH CHECK (true); -- Allow any update, not just when is_admin() is true

-- Fix RLS policy for cms_items to allow deactivation  
DROP POLICY IF EXISTS "Admins can update CMS items" ON public.cms_items;

CREATE POLICY "Admins can update CMS items" 
ON public.cms_items 
FOR UPDATE 
USING (is_admin())
WITH CHECK (true); -- Allow any update, not just when is_admin() is true