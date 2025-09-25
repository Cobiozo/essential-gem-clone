-- Allow admins to view all sections regardless of is_active
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cms_sections' AND policyname = 'Admins can view all sections'
  ) THEN
    CREATE POLICY "Admins can view all sections"
    ON public.cms_sections
    FOR SELECT
    USING (public.is_admin());
  END IF;
END $$;

-- Allow admins to view all items regardless of is_active
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cms_items' AND policyname = 'Admins can view all items'
  ) THEN
    CREATE POLICY "Admins can view all items"
    ON public.cms_items
    FOR SELECT
    USING (public.is_admin());
  END IF;
END $$;