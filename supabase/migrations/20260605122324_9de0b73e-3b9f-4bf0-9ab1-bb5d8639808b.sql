
-- 1. Add moderation columns to news_hub_comments
ALTER TABLE public.news_hub_comments
  ADD COLUMN IF NOT EXISTS is_pending_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_words text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_decision text;

DO $$ BEGIN
  ALTER TABLE public.news_hub_comments
    ADD CONSTRAINT news_hub_comments_review_decision_chk
    CHECK (review_decision IS NULL OR review_decision IN ('approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS news_hub_comments_pending_idx
  ON public.news_hub_comments (created_at DESC) WHERE is_pending_review = true;

-- 2. Banned words table
CREATE TABLE IF NOT EXISTS public.news_hub_comment_banned_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS news_hub_banned_words_lower_uq
  ON public.news_hub_comment_banned_words (lower(word));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_hub_comment_banned_words TO authenticated;
GRANT ALL ON public.news_hub_comment_banned_words TO service_role;

ALTER TABLE public.news_hub_comment_banned_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage banned words" ON public.news_hub_comment_banned_words;
CREATE POLICY "admins manage banned words" ON public.news_hub_comment_banned_words
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_moderator_module(auth.uid(), 'news_hub'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_moderator_module(auth.uid(), 'news_hub'));

-- 3. Profanity scan function
CREATE OR REPLACE FUNCTION public.scan_comment_profanity(_content text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hits text[] := '{}';
  w text;
  normalized text;
BEGIN
  IF _content IS NULL OR length(_content) = 0 THEN RETURN hits; END IF;
  normalized := lower(_content);
  FOR w IN SELECT lower(word) FROM public.news_hub_comment_banned_words LOOP
    IF normalized ~* ('(^|[^[:alpha:]])' || regexp_replace(w, '([.\\\\^$|?*+()\\[\\]{}])', '\\\\\\1', 'g') || '([^[:alpha:]]|$)') THEN
      hits := array_append(hits, w);
    END IF;
  END LOOP;
  RETURN hits;
END;
$$;

-- 4. Trigger that auto-flags comments
CREATE OR REPLACE FUNCTION public.news_hub_comments_moderate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hits text[];
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.content = OLD.content THEN
    RETURN NEW;
  END IF;
  hits := public.scan_comment_profanity(NEW.content);
  IF array_length(hits, 1) IS NOT NULL THEN
    NEW.flagged_words := hits;
    NEW.is_pending_review := true;
    NEW.is_hidden := true;
    NEW.review_decision := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
  ELSE
    NEW.flagged_words := '{}';
    -- only auto-clear pending state if not already approved by mod
    IF TG_OP = 'INSERT' THEN
      NEW.is_pending_review := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_news_hub_comments_moderate ON public.news_hub_comments;
CREATE TRIGGER trg_news_hub_comments_moderate
  BEFORE INSERT OR UPDATE OF content ON public.news_hub_comments
  FOR EACH ROW EXECUTE FUNCTION public.news_hub_comments_moderate();

-- 5. Replace RLS policies: 5-minute window for authors, moderators always
DROP POLICY IF EXISTS "read visible comments" ON public.news_hub_comments;
CREATE POLICY "read visible comments" ON public.news_hub_comments
  FOR SELECT TO authenticated
  USING (
    (is_hidden = false AND is_pending_review = false)
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_moderator_module(auth.uid(), 'news_hub')
  );

DROP POLICY IF EXISTS "update own or moderate" ON public.news_hub_comments;
CREATE POLICY "update own or moderate" ON public.news_hub_comments
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_moderator_module(auth.uid(), 'news_hub')
    OR (
      user_id = auth.uid()
      AND is_pending_review = false
      AND created_at > now() - interval '5 minutes'
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_moderator_module(auth.uid(), 'news_hub')
    OR (
      user_id = auth.uid()
      AND is_pending_review = false
      AND created_at > now() - interval '5 minutes'
    )
  );

DROP POLICY IF EXISTS "delete own or admin" ON public.news_hub_comments;
CREATE POLICY "delete own or admin" ON public.news_hub_comments
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_moderator_module(auth.uid(), 'news_hub')
    OR (
      user_id = auth.uid()
      AND is_pending_review = false
      AND created_at > now() - interval '5 minutes'
    )
  );

-- 6. Seed common Polish + English profanity (idempotent)
INSERT INTO public.news_hub_comment_banned_words (word)
SELECT w FROM (VALUES
  ('kurwa'),('kurwy'),('kurwo'),('kurew'),('chuj'),('chuja'),('chujem'),('chuje'),('chujowy'),('chujnia'),
  ('pizda'),('pizdy'),('pizdo'),('pierdol'),('pierdolic'),('pierdolić'),('pierdole'),('pierdolony'),('pierdolona'),
  ('jebac'),('jebać'),('jebany'),('jebana'),('jebane'),('jebani'),('zjebany'),('zajebisty'),('wyjebane'),('wjebac'),
  ('cipa'),('cipy'),('cipka'),('cwel'),('cwele'),('debil'),('debilu'),('debile'),('idiota'),('idioto'),('kretyn'),('kretynie'),
  ('skurwysyn'),('skurwiel'),('suka'),('suki'),('szmata'),('szmaty'),('dziwka'),('dziwki'),('huj'),('hujem'),
  ('sex'),('porno'),('gówno'),('gowno'),('gowniany'),('gówniany'),('zasrany'),('zasrana'),
  ('fuck'),('fucker'),('fucking'),('shit'),('bitch'),('asshole'),('bastard'),('dick'),('cunt'),('motherfucker'),('nigger'),('faggot')
) AS t(w)
ON CONFLICT ((lower(word))) DO NOTHING;
