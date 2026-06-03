-- Pozwól moderatorom z modułem 'news_hub' zarządzać postami News Hub
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'news_hub_posts'
  ) THEN
    -- usuwamy istniejącą politykę o tej samej nazwie (idempotent)
    EXECUTE 'DROP POLICY IF EXISTS "Moderators with news_hub module manage posts" ON public.news_hub_posts';
    EXECUTE $POL$
      CREATE POLICY "Moderators with news_hub module manage posts"
      ON public.news_hub_posts
      FOR ALL
      TO authenticated
      USING (public.has_moderator_module(auth.uid(), 'news_hub'))
      WITH CHECK (public.has_moderator_module(auth.uid(), 'news_hub'))
    $POL$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'news_hub_categories'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Moderators with news_hub module manage categories" ON public.news_hub_categories';
    EXECUTE $POL$
      CREATE POLICY "Moderators with news_hub module manage categories"
      ON public.news_hub_categories
      FOR ALL
      TO authenticated
      USING (public.has_moderator_module(auth.uid(), 'news_hub'))
      WITH CHECK (public.has_moderator_module(auth.uid(), 'news_hub'))
    $POL$;
  END IF;
END $$;