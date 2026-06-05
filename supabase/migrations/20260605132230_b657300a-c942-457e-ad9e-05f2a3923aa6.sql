-- 1. parent_id for replies
ALTER TABLE public.news_hub_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid NULL REFERENCES public.news_hub_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS news_hub_comments_post_parent_created_idx
  ON public.news_hub_comments (post_id, parent_id, created_at);

-- Enforce one-level threading: a reply's parent must itself be a top-level comment
CREATE OR REPLACE FUNCTION public.news_hub_comments_enforce_one_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_parent uuid;
  parent_post uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT parent_id, post_id INTO parent_parent, parent_post
    FROM public.news_hub_comments WHERE id = NEW.parent_id;
  IF parent_parent IS NOT NULL THEN
    RAISE EXCEPTION 'Replies cannot be nested further than one level';
  END IF;
  IF parent_post IS DISTINCT FROM NEW.post_id THEN
    RAISE EXCEPTION 'Reply must belong to the same post as its parent';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_news_hub_comments_one_level ON public.news_hub_comments;
CREATE TRIGGER trg_news_hub_comments_one_level
  BEFORE INSERT OR UPDATE OF parent_id ON public.news_hub_comments
  FOR EACH ROW EXECUTE FUNCTION public.news_hub_comments_enforce_one_level();

-- 2. Reactions table
CREATE TABLE IF NOT EXISTS public.news_hub_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.news_hub_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS news_hub_comment_reactions_comment_idx
  ON public.news_hub_comment_reactions (comment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_hub_comment_reactions TO authenticated;
GRANT ALL ON public.news_hub_comment_reactions TO service_role;

ALTER TABLE public.news_hub_comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read all reactions" ON public.news_hub_comment_reactions;
CREATE POLICY "read all reactions" ON public.news_hub_comment_reactions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert own reaction" ON public.news_hub_comment_reactions;
CREATE POLICY "insert own reaction" ON public.news_hub_comment_reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update own reaction" ON public.news_hub_comment_reactions;
CREATE POLICY "update own reaction" ON public.news_hub_comment_reactions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete own or moderator" ON public.news_hub_comment_reactions;
CREATE POLICY "delete own or moderator" ON public.news_hub_comment_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_moderator_module(auth.uid(), 'news_hub'));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.news_hub_comment_reactions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
