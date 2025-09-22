-- Replace overly broad admin RLS policies that blocked SELECT for non-admin/anon users

-- Helper function: create policy only if it doesn't exist
-- We emulate IF NOT EXISTS using DO blocks

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cms_sections' AND policyname = 'Admins can insert CMS sections'
  ) THEN
    CREATE POLICY "Admins can insert CMS sections"
    ON public.cms_sections
    FOR INSERT
    AS RESTRICTIVE
    WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cms_sections' AND policyname = 'Admins can update CMS sections'
  ) THEN
    CREATE POLICY "Admins can update CMS sections"
    ON public.cms_sections
    FOR UPDATE
    AS RESTRICTIVE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cms_sections' AND policyname = 'Admins can delete CMS sections'
  ) THEN
    CREATE POLICY "Admins can delete CMS sections"
    ON public.cms_sections
    FOR DELETE
    AS RESTRICTIVE
    USING (public.is_admin());
  END IF;
END $$;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cms_items' AND policyname = 'Admins can insert CMS items'
  ) THEN
    CREATE POLICY "Admins can insert CMS items"
    ON public.cms_items
    FOR INSERT
    AS RESTRICTIVE
    WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cms_items' AND policyname = 'Admins can update CMS items'
  ) THEN
    CREATE POLICY "Admins can update CMS items"
    ON public.cms_items
    FOR UPDATE
    AS RESTRICTIVE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cms_items' AND policyname = 'Admins can delete CMS items'
  ) THEN
    CREATE POLICY "Admins can delete CMS items"
    ON public.cms_items
    FOR DELETE
    AS RESTRICTIVE
    USING (public.is_admin());
  END IF;
END $$;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pages' AND policyname = 'Admins can insert pages'
  ) THEN
    CREATE POLICY "Admins can insert pages"
    ON public.pages
    FOR INSERT
    AS RESTRICTIVE
    WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pages' AND policyname = 'Admins can update pages'
  ) THEN
    CREATE POLICY "Admins can update pages"
    ON public.pages
    FOR UPDATE
    AS RESTRICTIVE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pages' AND policyname = 'Admins can delete pages'
  ) THEN
    CREATE POLICY "Admins can delete pages"
    ON public.pages
    FOR DELETE
    AS RESTRICTIVE
    USING (public.is_admin());
  END IF;
END $$;