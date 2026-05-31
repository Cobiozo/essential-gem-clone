
ALTER TABLE public.paid_events
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_event_consent_text text;

ALTER TABLE public.paid_event_orders
  ADD COLUMN IF NOT EXISTS email_confirmation_token text,
  ADD COLUMN IF NOT EXISTS email_confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_paid_event_orders_email_confirmation_token
  ON public.paid_event_orders(email_confirmation_token)
  WHERE email_confirmation_token IS NOT NULL;
