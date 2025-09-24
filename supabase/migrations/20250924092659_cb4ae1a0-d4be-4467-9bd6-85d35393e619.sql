-- Add visible_to_anonymous field to cms_sections and pages tables
ALTER TABLE public.cms_sections 
ADD COLUMN visible_to_anonymous boolean NOT NULL DEFAULT false;

ALTER TABLE public.pages 
ADD COLUMN visible_to_anonymous boolean NOT NULL DEFAULT false;

-- Update RLS policies for cms_sections to include anonymous users
DROP POLICY IF EXISTS "Users can view sections based on role visibility" ON public.cms_sections;
DROP POLICY IF EXISTS "Anon can view sections for everyone" ON public.cms_sections;

-- Create new comprehensive RLS policy for cms_sections
CREATE POLICY "Users can view sections based on role visibility" ON public.cms_sections
FOR SELECT USING (
  is_active = true AND (
    get_current_user_role() = 'admin' OR
    visible_to_everyone = true OR
    (visible_to_clients = true AND get_current_user_role() IN ('client', 'user')) OR
    (visible_to_partners = true AND get_current_user_role() = 'partner') OR
    (visible_to_specjalista = true AND get_current_user_role() = 'specjalista') OR
    (visible_to_anonymous = true AND auth.uid() IS NULL)
  )
);

-- Create policy for anonymous users to view sections
CREATE POLICY "Anon can view sections" ON public.cms_sections
FOR SELECT USING (
  is_active = true AND (
    visible_to_everyone = true OR 
    visible_to_anonymous = true
  )
);

-- Update RLS policies for pages to include anonymous users
DROP POLICY IF EXISTS "Users can view pages based on role visibility" ON public.pages;
DROP POLICY IF EXISTS "Anon can view published pages for everyone" ON public.pages;

-- Create new comprehensive RLS policy for pages
CREATE POLICY "Users can view pages based on role visibility" ON public.pages
FOR SELECT USING (
  is_published = true AND is_active = true AND (
    get_current_user_role() = 'admin' OR
    visible_to_everyone = true OR
    (visible_to_clients = true AND get_current_user_role() IN ('client', 'user')) OR
    (visible_to_partners = true AND get_current_user_role() = 'partner') OR
    (visible_to_specjalista = true AND get_current_user_role() = 'specjalista') OR
    (visible_to_anonymous = true AND auth.uid() IS NULL)
  )
);

-- Create policy for anonymous users to view pages
CREATE POLICY "Anon can view published pages" ON public.pages
FOR SELECT USING (
  is_published = true AND is_active = true AND (
    visible_to_everyone = true OR 
    visible_to_anonymous = true
  )
);