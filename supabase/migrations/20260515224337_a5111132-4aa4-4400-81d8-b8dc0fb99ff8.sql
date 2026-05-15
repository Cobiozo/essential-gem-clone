ALTER TABLE public.training_lessons
ADD COLUMN IF NOT EXISTS playback_speed_enabled boolean NOT NULL DEFAULT false;