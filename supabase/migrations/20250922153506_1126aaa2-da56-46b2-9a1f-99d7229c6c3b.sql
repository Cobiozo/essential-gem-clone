-- Minimal fix: drop overly broad ALL policies that block SELECT
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
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cms_items' AND policyname = 'Only admins can manage CMS items'
  ) THEN
    DROP POLICY "Only admins can manage CMS items" ON public.cms_items;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pages' AND policyname = 'Only admins can manage pages'
  ) THEN
    DROP POLICY "Only admins can manage pages" ON public.pages;
  END IF;
END $$;