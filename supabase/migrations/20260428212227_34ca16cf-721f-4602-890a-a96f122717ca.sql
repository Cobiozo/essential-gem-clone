ALTER TABLE public.paid_events
  ADD COLUMN IF NOT EXISTS show_last_spots_label boolean NOT NULL DEFAULT false;