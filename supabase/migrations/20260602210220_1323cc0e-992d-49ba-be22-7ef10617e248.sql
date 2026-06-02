
-- Expand frequency constraint to allow all new values
ALTER TABLE public.intro_video_settings DROP CONSTRAINT IF EXISTS intro_video_settings_frequency_check;
ALTER TABLE public.intro_video_settings ADD CONSTRAINT intro_video_settings_frequency_check
  CHECK (frequency IN ('always','once_per_session','once_per_day','once_per_week','once_per_user','every_login'));

-- Add multi-moment trigger column (array of moments)
ALTER TABLE public.intro_video_settings
  ADD COLUMN IF NOT EXISTS trigger_moments TEXT[] NOT NULL DEFAULT ARRAY['app_start']::TEXT[];

-- Keep single trigger_moment for backward compat (nullable)
ALTER TABLE public.intro_video_settings
  ADD COLUMN IF NOT EXISTS trigger_moment TEXT;
