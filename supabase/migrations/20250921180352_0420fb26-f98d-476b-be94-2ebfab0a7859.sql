-- Update RLS policies to include specjalista role visibility

-- Update cms_sections RLS policy to include specjalista visibility
DROP POLICY IF EXISTS "Users can view sections based on role visibility" ON public.cms_sections;

CREATE POLICY "Users can view sections based on role visibility" 
ON public.cms_sections 
FOR SELECT 
TO authenticated
USING (
  (is_active = true) AND (
    (get_current_user_role() = 'admin') OR 
    (visible_to_everyone = true) OR 
    ((visible_to_clients = true) AND (get_current_user_role() = ANY (ARRAY['client', 'user']))) OR 
    ((visible_to_partners = true) AND (get_current_user_role() = 'partner')) OR
    ((visible_to_specjalista = true) AND (get_current_user_role() = 'specjalista'))
  )
);

-- Update pages RLS policy to include specjalista visibility  
DROP POLICY IF EXISTS "Users can view pages based on role visibility" ON public.pages;

CREATE POLICY "Users can view pages based on role visibility" 
ON public.pages 
FOR SELECT 
TO authenticated
USING (
  (is_published = true) AND (is_active = true) AND (
    (get_current_user_role() = 'admin') OR 
    (visible_to_everyone = true) OR 
    ((visible_to_clients = true) AND (get_current_user_role() = ANY (ARRAY['client', 'user']))) OR 
    ((visible_to_partners = true) AND (get_current_user_role() = 'partner')) OR
    ((visible_to_specjalista = true) AND (get_current_user_role() = 'specjalista'))
  )
);