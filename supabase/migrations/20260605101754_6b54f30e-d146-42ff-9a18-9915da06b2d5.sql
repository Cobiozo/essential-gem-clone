
CREATE TABLE public.news_hub_banner_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  enabled boolean NOT NULL DEFAULT false,
  image_url text,
  title text DEFAULT 'Centrum Aktualności',
  subtitle text DEFAULT 'Ogłoszenia, artykuły, wideo, pliki i wiele więcej.',
  cta_label text,
  cta_url text,
  fit text NOT NULL DEFAULT 'cover',
  position text NOT NULL DEFAULT 'center',
  height integer NOT NULL DEFAULT 320,
  overlay_color text NOT NULL DEFAULT '#000000',
  overlay_opacity numeric NOT NULL DEFAULT 0.4,
  overlay_gradient boolean NOT NULL DEFAULT true,
  title_color text NOT NULL DEFAULT '#ffffff',
  subtitle_color text NOT NULL DEFAULT '#e5e7eb',
  text_align text NOT NULL DEFAULT 'left',
  title_size integer NOT NULL DEFAULT 40,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.news_hub_banner_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_hub_banner_config TO authenticated;
GRANT ALL ON public.news_hub_banner_config TO service_role;

ALTER TABLE public.news_hub_banner_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banner_config_select_all" ON public.news_hub_banner_config
  FOR SELECT USING (true);

CREATE POLICY "banner_config_admin_insert" ON public.news_hub_banner_config
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "banner_config_admin_update" ON public.news_hub_banner_config
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "banner_config_admin_delete" ON public.news_hub_banner_config
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.news_hub_banner_config (id) VALUES (true) ON CONFLICT DO NOTHING;
