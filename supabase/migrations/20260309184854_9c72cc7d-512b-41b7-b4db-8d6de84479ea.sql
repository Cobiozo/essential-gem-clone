ALTER TABLE public.auto_webinar_config
  ADD COLUMN IF NOT EXISTS room_title text DEFAULT 'Webinar NA ŻYWO',
  ADD COLUMN IF NOT EXISTS room_subtitle text,
  ADD COLUMN IF NOT EXISTS room_background_color text DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS room_show_live_badge boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS room_show_schedule_info boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS room_logo_url text,
  ADD COLUMN IF NOT EXISTS invitation_title text,
  ADD COLUMN IF NOT EXISTS invitation_description text,
  ADD COLUMN IF NOT EXISTS invitation_image_url text,
  ADD COLUMN IF NOT EXISTS countdown_label text DEFAULT 'Następny webinar za';