-- Fix RLS policies so anonymous and non-admin users can view public content
-- Problem: existing restrictive 'ALL' admin policies were unintentionally restricting SELECT
-- Solution: replace 'ALL' admin policies with separate INSERT/UPDATE/DELETE policies

-- 1) CMS Sections
DO $$
BEGIN
  -- Drop the overly broad admin policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cms_sections' AND policyname = 'Only admins can manage CMS sections'
  ) THEN
    DROP POLICY "Only admins can manage CMS sections" ON public.cms_sections;
  END IF;
END $$;

-- Create restrictive policies for write operations only
CREATE POLICY IF NOT EXISTS "Admins can insert CMS sections"
ON public.cms_sections
FOR INSERT
AS RESTRICTIVE
WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS "Admins can update CMS sections"
ON public.cms_sections
FOR UPDATE
AS RESTRICTIVE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS "Admins can delete CMS sections"
ON public.cms_sections
FOR DELETE
AS RESTRICTIVE
USING (public.is_admin());

-- 2) CMS Items
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cms_items' AND policyname = 'Only admins can manage CMS items'
  ) THEN
    DROP POLICY "Only admins can manage CMS items" ON public.cms_items;
  END IF;
END $$;

CREATE POLICY IF NOT EXISTS "Admins can insert CMS items"
ON public.cms_items
FOR INSERT
AS RESTRICTIVE
WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS "Admins can update CMS items"
ON public.cms_items
FOR UPDATE
AS RESTRICTIVE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS "Admins can delete CMS items"
ON public.cms_items
FOR DELETE
AS RESTRICTIVE
USING (public.is_admin());

-- Ensure read access policy remains for active items
-- (kept as-is, but recreate defensively if missing)
CREATE POLICY IF NOT EXISTS "Anyone can view active CMS items"
ON public.cms_items
FOR SELECT
AS RESTRICTIVE
USING (is_active = true);

-- 3) Pages
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pages' AND policyname = 'Only admins can manage pages'
  ) THEN
    DROP POLICY "Only admins can manage pages" ON public.pages;
  END IF;
END $$;

CREATE POLICY IF NOT EXISTS "Admins can insert pages"
ON public.pages
FOR INSERT
AS RESTRICTIVE
WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS "Admins can update pages"
ON public.pages
FOR UPDATE
AS RESTRICTIVE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS "Admins can delete pages"
ON public.pages
FOR DELETE
AS RESTRICTIVE
USING (public.is_admin());

-- Ensure read access policy remains (published & active, role-based visibility)
CREATE POLICY IF NOT EXISTS "Users can view pages based on role visibility"
ON public.pages
FOR SELECT
AS RESTRICTIVE
USING (
  is_published = true AND is_active = true AND (
    public.get_current_user_role() = 'admin' OR
    visible_to_everyone = true OR
    (visible_to_clients = true AND public.get_current_user_role() = ANY (ARRAY['client','user'])) OR
    (visible_to_partners = true AND public.get_current_user_role() = 'partner') OR
    (visible_to_specjalista = true AND public.get_current_user_role() = 'specjalista')
  )
);

-- Ensure read access policy remains for sections (role-based visibility)
CREATE POLICY IF NOT EXISTS "Users can view sections based on role visibility"
ON public.cms_sections
FOR SELECT
AS RESTRICTIVE
USING (
  is_active = true AND (
    public.get_current_user_role() = 'admin' OR
    visible_to_everyone = true OR
    (visible_to_clients = true AND public.get_current_user_role() = ANY (ARRAY['client','user'])) OR
    (visible_to_partners = true AND public.get_current_user_role() = 'partner') OR
    (visible_to_specjalista = true AND public.get_current_user_role() = 'specjalista')
  )
);
