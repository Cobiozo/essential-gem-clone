-- Ensure anonymous users can view public content without relying on role function

-- 1) cms_sections: allow anon to select sections marked for everyone
CREATE POLICY IF NOT EXISTS "Anon can view sections for everyone"
ON public.cms_sections
FOR SELECT
TO anon
USING (
  is_active = true AND visible_to_everyone = true
);

-- 2) pages: allow anon to select published pages marked for everyone
CREATE POLICY IF NOT EXISTS "Anon can view published pages for everyone"
ON public.pages
FOR SELECT
TO anon
USING (
  is_published = true AND is_active = true AND visible_to_everyone = true
);