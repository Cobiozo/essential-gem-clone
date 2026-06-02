-- Intro video settings (single row)
CREATE TABLE public.intro_video_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  video_url TEXT,
  show_on_auth_only BOOLEAN NOT NULL DEFAULT false,
  show_on_anonymous BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'always' CHECK (frequency IN ('always','once_per_session','once_per_day')),
  skip_after_ms INTEGER NOT NULL DEFAULT 1500,
  allow_skip BOOLEAN NOT NULL DEFAULT true,
  default_muted BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT ON public.intro_video_settings TO anon;
GRANT SELECT ON public.intro_video_settings TO authenticated;
GRANT ALL ON public.intro_video_settings TO service_role;

ALTER TABLE public.intro_video_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read intro video settings"
ON public.intro_video_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can insert intro video settings"
ON public.intro_video_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update intro video settings"
ON public.intro_video_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete intro video settings"
ON public.intro_video_settings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed single row
INSERT INTO public.intro_video_settings (enabled) VALUES (false);

-- Storage RLS policies for intro-videos bucket (bucket created via tool)
CREATE POLICY "Intro videos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'intro-videos');

CREATE POLICY "Admins can upload intro videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'intro-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update intro videos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'intro-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete intro videos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'intro-videos' AND public.has_role(auth.uid(), 'admin'::app_role));