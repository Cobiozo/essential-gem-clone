CREATE TABLE IF NOT EXISTS public.news_hub_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  grid_layout TEXT NOT NULL DEFAULT 'bento',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = true)
);

ALTER TABLE public.news_hub_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read news hub settings"
ON public.news_hub_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert news hub settings"
ON public.news_hub_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update news hub settings"
ON public.news_hub_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.news_hub_settings (id, grid_layout) VALUES (true, 'bento')
ON CONFLICT (id) DO NOTHING;