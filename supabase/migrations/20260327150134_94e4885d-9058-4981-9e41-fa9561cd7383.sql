
-- 1. Table for per-occurrence reminder tracking (replaces old flag-based approach for cyclic events)
CREATE TABLE IF NOT EXISTS public.occurrence_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  occurrence_index INT, -- NULL for single-occurrence events
  occurrence_datetime TIMESTAMPTZ NOT NULL, -- actual date/time of this specific term
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID, -- NULL for guests
  recipient_type TEXT NOT NULL DEFAULT 'user' CHECK (recipient_type IN ('user', 'guest')),
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '12h', '2h', '1h', '15min')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_registration_id UUID, -- reference to event_registrations.id or guest_event_registrations.id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Unique constraint: one reminder per type per occurrence per recipient
  UNIQUE (event_id, occurrence_index, recipient_email, reminder_type, occurrence_datetime)
);

-- Index for fast lookups
CREATE INDEX idx_occurrence_reminders_event ON public.occurrence_reminders_sent (event_id, occurrence_index, reminder_type);
CREATE INDEX idx_occurrence_reminders_email ON public.occurrence_reminders_sent (recipient_email, event_id);

-- RLS
ALTER TABLE public.occurrence_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Only service role / admin can read/write
CREATE POLICY "Admin can manage occurrence reminders"
  ON public.occurrence_reminders_sent
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Add occurrence_index to guest_event_registrations (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guest_event_registrations' 
    AND column_name = 'occurrence_index'
  ) THEN
    ALTER TABLE public.guest_event_registrations ADD COLUMN occurrence_index INT;
  END IF;
END $$;
