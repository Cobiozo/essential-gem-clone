ALTER TABLE public.auto_webinar_config
  ADD COLUMN IF NOT EXISTS visible_to_partners boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_to_specjalista boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_to_clients boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_in_calendar boolean DEFAULT false;