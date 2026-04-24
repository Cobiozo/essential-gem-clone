ALTER TABLE public.paid_events
  ADD COLUMN IF NOT EXISTS guests_show_description boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS guests_show_speakers    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS guests_show_tickets     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS guests_show_schedule    boolean NOT NULL DEFAULT true;

ALTER TABLE public.paid_event_content_sections
  ADD COLUMN IF NOT EXISTS visible_to_guests boolean NOT NULL DEFAULT true;