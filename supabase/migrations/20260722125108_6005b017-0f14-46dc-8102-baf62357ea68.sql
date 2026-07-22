
-- Homepage variant switcher + editable V2 content
CREATE TABLE IF NOT EXISTS public.homepage_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_variant text NOT NULL DEFAULT 'v1' CHECK (active_variant IN ('v1','v2')),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.homepage_settings TO anon;
GRANT SELECT ON public.homepage_settings TO authenticated;
GRANT ALL ON public.homepage_settings TO service_role;

ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Homepage settings readable by everyone"
  ON public.homepage_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify homepage settings"
  ON public.homepage_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


CREATE TABLE IF NOT EXISTS public.homepage_v2_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft_content jsonb,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.homepage_v2_content TO anon;
GRANT SELECT ON public.homepage_v2_content TO authenticated;
GRANT ALL ON public.homepage_v2_content TO service_role;

ALTER TABLE public.homepage_v2_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Homepage v2 content readable by everyone"
  ON public.homepage_v2_content FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify homepage v2 content"
  ON public.homepage_v2_content FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed defaults matching the uploaded mockup
INSERT INTO public.homepage_settings (active_variant) VALUES ('v1')
ON CONFLICT (singleton) DO NOTHING;

INSERT INTO public.homepage_v2_content (content, published_at)
VALUES (
  jsonb_build_object(
    'hero', jsonb_build_object(
      'eyebrow', 'TWOJE CENTRUM',
      'titleLine1', 'Zdrowie.',
      'titleLine2', 'Wiedza.',
      'titleLine3', 'Więcej życia.',
      'description', 'Pure Life Center to miejsce, które daje Ci wiedzę, wsparcie i narzędzia do lepszego życia. Razem zmieniamy zdrowie ludzi na lepsze.',
      'primaryCtaText', 'Dołącz do społeczności',
      'primaryCtaUrl', '/auth',
      'secondaryCtaText', 'Zobacz jak działa',
      'secondaryCtaUrl', '#community',
      'socialProofText', 'Dołączyło już ponad 1200 osób, które zmieniają swoje życie na lepsze.',
      'avatars', '[]'::jsonb,
      'mockupImage', ''
    ),
    'features', jsonb_build_object(
      'eyebrow', 'CO ZYSKUJESZ?',
      'title', 'Wszystko, czego potrzebujesz w jednym miejscu',
      'items', jsonb_build_array(
        jsonb_build_object('icon','HeartPulse','title','Zdrowie','description','Naturalne rozwiązania oparte na nauce, które wspierają Twoje zdrowie każdego dnia.'),
        jsonb_build_object('icon','GraduationCap','title','Akademia','description','Kursy, szkolenia i materiały, które rozwijają wiedzę i dają nowe możliwości.'),
        jsonb_build_object('icon','PlayCircle','title','Webinary','description','Spotkania na żywo z ekspertami i praktyczna wiedza, którą możesz od razu wykorzystać.'),
        jsonb_build_object('icon','Users','title','Społeczność','description','Ludzie, którzy inspirują, wspierają i motywują do działania.'),
        jsonb_build_object('icon','Target','title','Cele','description','Ustal cele, monitoruj postępy i osiągaj więcej każdego dnia.')
      )
    ),
    'stats', jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object('icon','Users','value','1200+','label','aktywnych użytkowników'),
        jsonb_build_object('icon','BookOpen','value','350+','label','materiałów edukacyjnych'),
        jsonb_build_object('icon','User','value','40+','label','specjalistów i ekspertów'),
        jsonb_build_object('icon','Clock','value','24/7','label','dostęp do platformy gdziekolwiek jesteś')
      )
    ),
    'community', jsonb_build_object(
      'eyebrow', 'RAZEM MOŻEMY WIĘCEJ',
      'title', 'Dołącz do ludzi, którzy chcą więcej od życia',
      'bullets', jsonb_build_array(
        'Wsparcie na każdym etapie',
        'Sprawdzona wiedza i doświadczenie',
        'Motywacja do działania',
        'Lepsze zdrowie i jakość życia'
      ),
      'ctaText', 'Zacznij swoją zmianę',
      'ctaUrl', '/auth',
      'backgroundImage', '',
      'overlayText', 'Zobacz jak nasza społeczność zmienia życie ludzi każdego dnia',
      'videoUrl', '',
      'peopleCount', '+1200 osób',
      'avatars', '[]'::jsonb
    ),
    'trustedBy', jsonb_build_object(
      'eyebrow', 'ZAUFALI NAM',
      'logos', '[]'::jsonb
    ),
    'seo', jsonb_build_object(
      'title', 'Pure Life Center — Twoje centrum zdrowia, wiedzy i społeczności',
      'description', 'Pure Life Center to miejsce, które daje Ci wiedzę, wsparcie i narzędzia do lepszego życia.'
    )
  ),
  now()
)
ON CONFLICT (singleton) DO NOTHING;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_v2_content;
