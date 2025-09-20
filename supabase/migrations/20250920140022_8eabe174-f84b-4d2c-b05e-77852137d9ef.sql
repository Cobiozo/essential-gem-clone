-- Add role visibility columns to cms_sections table
ALTER TABLE public.cms_sections 
ADD COLUMN visible_to_partners boolean NOT NULL DEFAULT false,
ADD COLUMN visible_to_clients boolean NOT NULL DEFAULT false,
ADD COLUMN visible_to_everyone boolean NOT NULL DEFAULT true;

-- Update RLS policy for cms_sections to respect role visibility
DROP POLICY IF EXISTS "Anyone can view active CMS sections" ON public.cms_sections;

CREATE POLICY "Users can view sections based on role visibility" ON public.cms_sections
FOR SELECT USING (
  is_active = true 
  AND (
    -- Always allow admins
    get_current_user_role() = 'admin'
    -- Allow if section is visible to everyone
    OR visible_to_everyone = true
    -- Allow if user is client/user and section is visible to clients
    OR (visible_to_clients = true AND get_current_user_role() IN ('client', 'user'))
    -- Allow if user is partner and section is visible to partners  
    OR (visible_to_partners = true AND get_current_user_role() = 'partner')
  )
);