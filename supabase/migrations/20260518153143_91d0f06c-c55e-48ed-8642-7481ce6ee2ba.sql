
-- Enum for post types
DO $$ BEGIN
  CREATE TYPE public.news_hub_post_type AS ENUM ('announcement','article','video','gallery','file','link','embed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.news_hub_bento_size AS ENUM ('s','m','l');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Categories
CREATE TABLE IF NOT EXISTS public.news_hub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'Megaphone',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Posts
CREATE TABLE IF NOT EXISTS public.news_hub_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.news_hub_post_type NOT NULL DEFAULT 'announcement',
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.news_hub_categories(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  cover_url TEXT,
  short_description TEXT,
  content TEXT,
  media_url TEXT,
  media_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  link_url TEXT,
  link_cta TEXT,
  embed_html TEXT,
  author_id UUID,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  bento_size public.news_hub_bento_size NOT NULL DEFAULT 'm',
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_hub_posts_pub ON public.news_hub_posts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_hub_posts_pinned ON public.news_hub_posts(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_news_hub_posts_type ON public.news_hub_posts(type);
CREATE INDEX IF NOT EXISTS idx_news_hub_posts_cat ON public.news_hub_posts(category_id);

-- Views log
CREATE TABLE IF NOT EXISTS public.news_hub_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.news_hub_posts(id) ON DELETE CASCADE,
  user_id UUID,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_hub_views_post ON public.news_hub_views(post_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.news_hub_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_news_hub_posts_upd ON public.news_hub_posts;
CREATE TRIGGER trg_news_hub_posts_upd BEFORE UPDATE ON public.news_hub_posts
FOR EACH ROW EXECUTE FUNCTION public.news_hub_set_updated_at();

DROP TRIGGER IF EXISTS trg_news_hub_cats_upd ON public.news_hub_categories;
CREATE TRIGGER trg_news_hub_cats_upd BEFORE UPDATE ON public.news_hub_categories
FOR EACH ROW EXECUTE FUNCTION public.news_hub_set_updated_at();

-- RLS
ALTER TABLE public.news_hub_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_hub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_hub_views ENABLE ROW LEVEL SECURITY;

-- Posts policies
DROP POLICY IF EXISTS "news_hub_posts_select_published" ON public.news_hub_posts;
CREATE POLICY "news_hub_posts_select_published" ON public.news_hub_posts
  FOR SELECT TO authenticated USING (is_published = true OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "news_hub_posts_admin_all" ON public.news_hub_posts;
CREATE POLICY "news_hub_posts_admin_all" ON public.news_hub_posts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Categories policies
DROP POLICY IF EXISTS "news_hub_cats_select_all" ON public.news_hub_categories;
CREATE POLICY "news_hub_cats_select_all" ON public.news_hub_categories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "news_hub_cats_admin_all" ON public.news_hub_categories;
CREATE POLICY "news_hub_cats_admin_all" ON public.news_hub_categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Views policies
DROP POLICY IF EXISTS "news_hub_views_insert_self" ON public.news_hub_views;
CREATE POLICY "news_hub_views_insert_self" ON public.news_hub_views
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "news_hub_views_admin_select" ON public.news_hub_views;
CREATE POLICY "news_hub_views_admin_select" ON public.news_hub_views
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-hub-media','news-hub-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "news_hub_media_public_read" ON storage.objects;
CREATE POLICY "news_hub_media_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'news-hub-media');

DROP POLICY IF EXISTS "news_hub_media_admin_write" ON storage.objects;
CREATE POLICY "news_hub_media_admin_write" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'news-hub-media' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "news_hub_media_admin_update" ON storage.objects;
CREATE POLICY "news_hub_media_admin_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'news-hub-media' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "news_hub_media_admin_delete" ON storage.objects;
CREATE POLICY "news_hub_media_admin_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'news-hub-media' AND public.has_role(auth.uid(),'admin'));

-- Seed default categories
INSERT INTO public.news_hub_categories (name, slug, color, icon, sort_order) VALUES
  ('Ogłoszenia','ogloszenia','#ef4444','Megaphone',1),
  ('Wydarzenia','wydarzenia','#f59e0b','Calendar',2),
  ('Edukacja','edukacja','#10b981','GraduationCap',3),
  ('Promocje','promocje','#8b5cf6','Tag',4),
  ('Aktualności','aktualnosci','#3b82f6','Newspaper',5)
ON CONFLICT (slug) DO NOTHING;
