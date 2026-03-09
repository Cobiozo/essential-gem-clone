
-- Auto Webinar Videos table
CREATE TABLE public.auto_webinar_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Auto Webinar Config table (singleton-like)
CREATE TABLE public.auto_webinar_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  playlist_mode TEXT NOT NULL DEFAULT 'sequential' CHECK (playlist_mode IN ('sequential', 'random')),
  start_hour INTEGER NOT NULL DEFAULT 8,
  end_hour INTEGER NOT NULL DEFAULT 22,
  interval_minutes INTEGER NOT NULL DEFAULT 60,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  chat_enabled BOOLEAN NOT NULL DEFAULT false,
  show_participant_count BOOLEAN NOT NULL DEFAULT true,
  welcome_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auto_webinar_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_webinar_config ENABLE ROW LEVEL SECURITY;

-- RLS for auto_webinar_videos
CREATE POLICY "Admins can manage auto_webinar_videos"
  ON public.auto_webinar_videos
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active auto_webinar_videos"
  ON public.auto_webinar_videos
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS for auto_webinar_config
CREATE POLICY "Admins can manage auto_webinar_config"
  ON public.auto_webinar_config
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view auto_webinar_config"
  ON public.auto_webinar_config
  FOR SELECT
  TO authenticated
  USING (true);
