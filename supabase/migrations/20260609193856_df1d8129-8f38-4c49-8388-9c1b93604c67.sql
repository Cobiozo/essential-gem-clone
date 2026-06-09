
-- 1. Add guest role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'guest';

-- 2. guest_invite_links
CREATE TABLE IF NOT EXISTS public.guest_invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_invite_links TO authenticated;
GRANT ALL ON public.guest_invite_links TO service_role;

ALTER TABLE public.guest_invite_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage guest invites"
  ON public.guest_invite_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. guest_visibility_global (singleton)
CREATE TABLE IF NOT EXISTS public.guest_visibility_global (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.guest_visibility_global TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.guest_visibility_global TO authenticated;
GRANT ALL ON public.guest_visibility_global TO service_role;

ALTER TABLE public.guest_visibility_global ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read global guest visibility"
  ON public.guest_visibility_global FOR SELECT
  USING (true);

CREATE POLICY "Admins write global guest visibility"
  ON public.guest_visibility_global FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default singleton row (safe minimal config)
INSERT INTO public.guest_visibility_global (config)
SELECT jsonb_build_object(
  'sidebar', jsonb_build_object('items', jsonb_build_object('dashboard', true, 'news', true, 'knowledge', false)),
  'topbar',  jsonb_build_object('sound', true, 'notifications', true, 'language', true, 'theme', true,
                                'tutorial', false, 'chat', false, 'calendar', false, 'switchClassic', false),
  'avatarMenu', jsonb_build_object('home', true, 'myAccount', true, 'settings', true,
                                    'apiSync', false, 'toolPanel', false, 'logout', true),
  'widgets', jsonb_build_object('newsBanner', true, 'infoBanners', true, 'map', false,
                                 'newsTicker', true, 'introVideo', false),
  'banners', jsonb_build_object('allowAll', false, 'items', '{}'::jsonb),
  'pages',   jsonb_build_object('html', '{}'::jsonb),
  'events',  jsonb_build_object('showPublicList', false, 'items', '{}'::jsonb)
)
WHERE NOT EXISTS (SELECT 1 FROM public.guest_visibility_global);

-- 4. guest_visibility_overrides
CREATE TABLE IF NOT EXISTS public.guest_visibility_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_visibility_overrides TO authenticated;
GRANT ALL ON public.guest_visibility_overrides TO service_role;

ALTER TABLE public.guest_visibility_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guest reads own override"
  ON public.guest_visibility_overrides FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write guest overrides"
  ON public.guest_visibility_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guest_invite_links_updated ON public.guest_invite_links;
CREATE TRIGGER trg_guest_invite_links_updated
  BEFORE UPDATE ON public.guest_invite_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_guest_visibility_global_updated ON public.guest_visibility_global;
CREATE TRIGGER trg_guest_visibility_global_updated
  BEFORE UPDATE ON public.guest_visibility_global
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_guest_visibility_overrides_updated ON public.guest_visibility_overrides;
CREATE TRIGGER trg_guest_visibility_overrides_updated
  BEFORE UPDATE ON public.guest_visibility_overrides
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. resolve_guest_invite (public, by token, no auth required)
CREATE OR REPLACE FUNCTION public.resolve_guest_invite(_token text)
RETURNS TABLE(id uuid, label text, is_valid boolean, reason text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  rec public.guest_invite_links%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM public.guest_invite_links WHERE token = _token LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, false, 'not_found'::text;
    RETURN;
  END IF;
  IF NOT rec.is_active THEN
    RETURN QUERY SELECT rec.id, rec.label, false, 'inactive'::text;
    RETURN;
  END IF;
  IF rec.expires_at IS NOT NULL AND rec.expires_at < now() THEN
    RETURN QUERY SELECT rec.id, rec.label, false, 'expired'::text;
    RETURN;
  END IF;
  IF rec.max_uses IS NOT NULL AND rec.used_count >= rec.max_uses THEN
    RETURN QUERY SELECT rec.id, rec.label, false, 'exhausted'::text;
    RETURN;
  END IF;
  RETURN QUERY SELECT rec.id, rec.label, true, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_guest_invite(text) TO anon, authenticated;

-- 7. consume_guest_invite (called by edge function with service role)
CREATE OR REPLACE FUNCTION public.consume_guest_invite(_token text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  rec public.guest_invite_links%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM public.guest_invite_links WHERE token = _token FOR UPDATE;
  IF NOT FOUND OR NOT rec.is_active THEN RETURN false; END IF;
  IF rec.expires_at IS NOT NULL AND rec.expires_at < now() THEN RETURN false; END IF;
  IF rec.max_uses IS NOT NULL AND rec.used_count >= rec.max_uses THEN RETURN false; END IF;

  UPDATE public.guest_invite_links SET used_count = used_count + 1 WHERE id = rec.id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'guest'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_guest_invite(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_guest_invite(text, uuid) TO service_role;
