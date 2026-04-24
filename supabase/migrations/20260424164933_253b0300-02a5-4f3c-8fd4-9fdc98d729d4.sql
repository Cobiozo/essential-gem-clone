
-- Add payment method configuration to paid_events
ALTER TABLE public.paid_events
  ADD COLUMN IF NOT EXISTS payment_method_payu boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_method_transfer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transfer_payment_details text;

-- Extend allowed order statuses to include 'awaiting_transfer'
ALTER TABLE public.paid_event_orders
  DROP CONSTRAINT IF EXISTS paid_event_orders_status_check;

ALTER TABLE public.paid_event_orders
  ADD CONSTRAINT paid_event_orders_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'awaiting_transfer'::text, 'paid'::text, 'cancelled'::text, 'refunded'::text]));
