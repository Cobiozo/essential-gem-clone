CREATE TABLE public.challenge_banner_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  enabled boolean NOT NULL DEFAULT false,
  image_url text,
  title text DEFAULT 'Wyzwanie 90-dniowe',
  subtitle text DEFAULT 'Codzienna dyscyplina. Realne efekty.',
  cta_label text,
  cta_url text,
  fit text NOT NULL DEFAULT 'cover',
  position text NOT NULL DEFAULT 'center',
  height integer NOT NULL DEFAULT 360,
  overlay_color text NOT NULL DEFAULT '#000000',
  overlay_opacity numeric NOT NULL DEFAULT 0.4,
  overlay_gradient boolean NOT NULL DEFAULT true,
  title_color text NOT NULL DEFAULT '#ffffff',
  subtitle_color text NOT NULL DEFAULT '#e5e7eb',
  text_align text NOT NULL DEFAULT 'left',
  title_size integer NOT NULL DEFAULT 40,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.challenge_banner_config TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.challenge_banner_config TO authenticated;
GRANT ALL ON public.challenge_banner_config TO service_role;

ALTER TABLE public.challenge_banner_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenge_banner_select_all"
  ON public.challenge_banner_config FOR SELECT
  USING (true);

CREATE POLICY "challenge_banner_admin_write"
  ON public.challenge_banner_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.challenge_banner_config (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_banner_config;