ALTER TABLE public.intro_video_settings
  ADD COLUMN IF NOT EXISTS display_size text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS custom_width_percent integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS position text NOT NULL DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS object_fit text NOT NULL DEFAULT 'contain',
  ADD COLUMN IF NOT EXISTS backdrop_style text NOT NULL DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS border_radius integer NOT NULL DEFAULT 16;