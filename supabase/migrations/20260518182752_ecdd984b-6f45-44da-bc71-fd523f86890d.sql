
-- A. Module-level visibility on news_hub_settings
ALTER TABLE public.news_hub_settings
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_to_admin boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_to_partner boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_to_client boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_to_specjalista boolean NOT NULL DEFAULT true;

-- Per-user module access override
CREATE TABLE IF NOT EXISTS public.news_hub_user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE public.news_hub_user_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS news_hub_user_access_admin_all ON public.news_hub_user_access;
CREATE POLICY news_hub_user_access_admin_all ON public.news_hub_user_access
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS news_hub_user_access_self_select ON public.news_hub_user_access;
CREATE POLICY news_hub_user_access_self_select ON public.news_hub_user_access
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- B. Per-article visibility on news_hub_posts
ALTER TABLE public.news_hub_posts
  ADD COLUMN IF NOT EXISTS visibility_mode text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS visible_to_admin boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_to_partner boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_to_client boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_to_specjalista boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'news_hub_posts_visibility_mode_chk') THEN
    ALTER TABLE public.news_hub_posts
      ADD CONSTRAINT news_hub_posts_visibility_mode_chk CHECK (visibility_mode IN ('public','restricted'));
  END IF;
END $$;

-- Per-user per-post access
CREATE TABLE IF NOT EXISTS public.news_hub_post_user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.news_hub_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_nhpua_user ON public.news_hub_post_user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_nhpua_post ON public.news_hub_post_user_access(post_id);
ALTER TABLE public.news_hub_post_user_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS news_hub_post_user_access_admin_all ON public.news_hub_post_user_access;
CREATE POLICY news_hub_post_user_access_admin_all ON public.news_hub_post_user_access
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS news_hub_post_user_access_self_select ON public.news_hub_post_user_access;
CREATE POLICY news_hub_post_user_access_self_select ON public.news_hub_post_user_access
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- C. SECURITY DEFINER function deciding per-post access
CREATE OR REPLACE FUNCTION public.has_news_post_access(_post_id uuid, _user uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_mode text;
  v_admin boolean;
  v_partner boolean;
  v_client boolean;
  v_spec boolean;
  v_role text;
BEGIN
  IF _user IS NULL THEN
    -- anonymous: only public posts
    SELECT visibility_mode INTO v_mode FROM public.news_hub_posts WHERE id = _post_id;
    RETURN COALESCE(v_mode, 'public') = 'public';
  END IF;

  IF has_role(_user, 'admin'::app_role) THEN
    RETURN true;
  END IF;

  SELECT visibility_mode, visible_to_admin, visible_to_partner, visible_to_client, visible_to_specjalista
    INTO v_mode, v_admin, v_partner, v_client, v_spec
  FROM public.news_hub_posts WHERE id = _post_id;

  IF v_mode IS NULL OR v_mode = 'public' THEN
    RETURN true;
  END IF;

  -- per-user explicit override
  IF EXISTS (SELECT 1 FROM public.news_hub_post_user_access WHERE post_id = _post_id AND user_id = _user) THEN
    RETURN true;
  END IF;

  -- role match
  SELECT lower(role::text) INTO v_role FROM public.user_roles WHERE user_id = _user LIMIT 1;
  IF v_role = 'partner' AND v_partner THEN RETURN true; END IF;
  IF v_role IN ('client','user') AND v_client THEN RETURN true; END IF;
  IF v_role = 'specjalista' AND v_spec THEN RETURN true; END IF;
  IF v_role = 'admin' AND v_admin THEN RETURN true; END IF;

  RETURN false;
END;
$$;

-- Replace the public SELECT policy to additionally check per-post access
DROP POLICY IF EXISTS news_hub_posts_select_published ON public.news_hub_posts;
CREATE POLICY news_hub_posts_select_published ON public.news_hub_posts
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (is_published = true AND public.has_news_post_access(id, auth.uid()))
  );
