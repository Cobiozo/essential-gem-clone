ALTER TABLE public.paid_event_tickets
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'inherit',
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all';

COMMENT ON COLUMN public.paid_event_tickets.payment_method IS 'Per-ticket payment method: inherit | payu | transfer | paypal | free';
COMMENT ON COLUMN public.paid_event_tickets.audience IS 'Per-ticket visibility: all | logged_in | guest_only';