-- Ensure anonymous users can view public content without relying on role function

-- 1) cms_sections: create policy for anon if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cms_sections' AND policyname = 'Anon can view sections for everyone'
  ) THEN
    CREATE POLICY "Anon can view sections for everyone"
    ON public.cms_sections
    FOR SELECT
    TO anon
    USING (
      is_active = true AND visible_to_everyone = true
    );
  END IF;
END $$;

-- 2) pages: create policy for anon if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pages' AND policyname = 'Anon can view published pages for everyone'
  ) THEN
    CREATE POLICY "Anon can view published pages for everyone"
    ON public.pages
    FOR SELECT
    TO anon
    USING (
      is_published = true AND is_active = true AND visible_to_everyone = true
    );
  END IF;
END $$;