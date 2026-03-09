ALTER TABLE public.auto_webinar_videos
ADD COLUMN IF NOT EXISTS host_name TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;