-- Replace overly broad admin RLS policies that blocked SELECT for non-admin/anon users
-- Solution: remove ALL policies and replace with specific INSERT/UPDATE/DELETE policies

-- 1) cms_sections: drop ALL policy and create separate write-only policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cms_sections' AND policyname = 'Only admins can manage CMS sections'
  ) THEN
    DROP POLICY "Only admins can manage CMS sections" ON public.cms_sections;
  END IF;
END $$;

CREATE POLICY "Admins can insert CMS sections"
ON public.cms_sections
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update CMS sections"
ON public.cms_sections
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete CMS sections"
ON public.cms_sections
FOR DELETE
TO authenticated
USING (public.is_admin());

-- 2) cms_items: drop ALL policy and create separate write-only policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cms_items' AND policyname = 'Only admins can manage CMS items'
  ) THEN
    DROP POLICY "Only admins can manage CMS items" ON public.cms_items;
  END IF;
END $$;

CREATE POLICY "Admins can insert CMS items"
ON public.cms_items
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update CMS items"
ON public.cms_items
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete CMS items"
ON public.cms_items
FOR DELETE
TO authenticated
USING (public.is_admin());

-- 3) pages: drop ALL policy and create separate write-only policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pages' AND policyname = 'Only admins can manage pages'
  ) THEN
    DROP POLICY "Only admins can manage pages" ON public.pages;
  END IF;
END $$;

CREATE POLICY "Admins can insert pages"
ON public.pages
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update pages"
ON public.pages
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete pages"
ON public.pages
FOR DELETE
TO authenticated
USING (public.is_admin());