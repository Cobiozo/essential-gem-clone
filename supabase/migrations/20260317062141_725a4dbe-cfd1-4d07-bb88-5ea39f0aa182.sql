
-- Add reminder tracking columns to event_registrations for logged-in users
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS reminder_12h_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_12h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_15min_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_15min_sent_at TIMESTAMPTZ;
