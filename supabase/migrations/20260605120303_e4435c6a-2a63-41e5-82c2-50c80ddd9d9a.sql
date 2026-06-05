
-- News Hub: Comments feature
ALTER TABLE public.news_hub_settings ADD COLUMN IF NOT EXISTS comments_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.news_hub_posts ADD COLUMN IF NOT EXISTS comments_mode text NOT NULL DEFAULT 'inherit';
DO $$ BEGIN
  ALTER TABLE public.news_hub_posts ADD CONSTRAINT news_hub_posts_comments_mode_chk CHECK (comments_mode IN ('inherit','on','off'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.news_hub_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.news_hub_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 2 AND 2000),
  is_hidden boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS news_hub_comments_post_created_idx ON public.news_hub_comments (post_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_hub_comments TO authenticated;
GRANT ALL ON public.news_hub_comments TO service_role;

ALTER TABLE public.news_hub_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read visible comments" ON public.news_hub_comments;
CREATE POLICY "read visible comments" ON public.news_hub_comments
  FOR SELECT TO authenticated
  USING (
    is_hidden = false
    OR user_id = auth.uid()
    OR public.has_moderator_module(auth.uid(), 'news_hub')
  );

DROP POLICY IF EXISTS "insert own comment" ON public.news_hub_comments;
CREATE POLICY "insert own comment" ON public.news_hub_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update own or moderate" ON public.news_hub_comments;
CREATE POLICY "update own or moderate" ON public.news_hub_comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_moderator_module(auth.uid(), 'news_hub'))
  WITH CHECK (user_id = auth.uid() OR public.has_moderator_module(auth.uid(), 'news_hub'));

DROP POLICY IF EXISTS "delete own or admin" ON public.news_hub_comments;
CREATE POLICY "delete own or admin" ON public.news_hub_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_moderator_module(auth.uid(), 'news_hub'));

DROP TRIGGER IF EXISTS trg_news_hub_comments_updated_at ON public.news_hub_comments;
CREATE TRIGGER trg_news_hub_comments_updated_at
  BEFORE UPDATE ON public.news_hub_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.news_hub_comments;
