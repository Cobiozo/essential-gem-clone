ALTER TABLE public.paid_event_tickets
  ADD COLUMN IF NOT EXISTS paypal_payment_link TEXT NULL;