ALTER TABLE public.auto_webinar_videos
ADD COLUMN config_id uuid REFERENCES public.auto_webinar_config(id) ON DELETE SET NULL;