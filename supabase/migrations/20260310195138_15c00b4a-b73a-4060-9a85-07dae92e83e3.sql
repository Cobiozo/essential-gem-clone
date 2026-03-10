ALTER TABLE guest_event_registrations
  ADD COLUMN IF NOT EXISTS reminder_12h_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_12h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent_at timestamptz;