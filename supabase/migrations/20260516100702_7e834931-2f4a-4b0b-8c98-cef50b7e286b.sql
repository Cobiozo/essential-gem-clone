CREATE TABLE IF NOT EXISTS public.profile_completion_banner_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  title text NOT NULL DEFAULT 'Uzupełnij swoje dane',
  message text NOT NULL DEFAULT 'Aby w pełni korzystać z platformy, uzupełnij brakujące dane w swoim profilu.',
  button_label text NOT NULL DEFAULT 'Uzupełnij dane',
  required_fields text[] NOT NULL DEFAULT ARRAY['street_address','postal_code','city','country']::text[],
  target_path text NOT NULL DEFAULT '/my-account',
  severity text NOT NULL DEFAULT 'warning',
  dismissible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_completion_banner_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read banner config" ON public.profile_completion_banner_config;
CREATE POLICY "Authenticated can read banner config"
ON public.profile_completion_banner_config
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert banner config" ON public.profile_completion_banner_config;
CREATE POLICY "Admins can insert banner config"
ON public.profile_completion_banner_config
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update banner config" ON public.profile_completion_banner_config;
CREATE POLICY "Admins can update banner config"
ON public.profile_completion_banner_config
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_profile_completion_banner_config_updated_at ON public.profile_completion_banner_config;
CREATE TRIGGER update_profile_completion_banner_config_updated_at
BEFORE UPDATE ON public.profile_completion_banner_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.profile_completion_banner_config (singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.city_geocache
  ADD COLUMN IF NOT EXISTS display_country text;