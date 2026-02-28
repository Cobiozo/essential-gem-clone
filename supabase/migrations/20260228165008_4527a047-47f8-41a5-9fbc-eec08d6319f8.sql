
-- Dodanie kolumn push reminder do tabeli events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS push_reminder_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS push_reminder_minutes JSONB DEFAULT NULL;

-- Tabela śledzenia wysłanych push-przypomnień
CREATE TABLE IF NOT EXISTS public.event_push_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID,
  guest_email TEXT,
  reminder_minutes INTEGER NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Unikalny indeks zapobiegający duplikatom
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_push_reminder
  ON public.event_push_reminders_sent (
    event_id, 
    COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), 
    COALESCE(guest_email, ''), 
    reminder_minutes
  );

-- RLS
ALTER TABLE public.event_push_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Admins mogą wszystko
CREATE POLICY "Admins manage push reminders sent"
  ON public.event_push_reminders_sent
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Service role (edge functions) potrzebuje dostępu - polityka dla insert przez service role
CREATE POLICY "Service can insert push reminders"
  ON public.event_push_reminders_sent
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can select push reminders"
  ON public.event_push_reminders_sent
  FOR SELECT
  USING (true);
