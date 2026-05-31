ALTER TABLE public.paid_event_orders
DROP CONSTRAINT IF EXISTS paid_event_orders_status_check;

ALTER TABLE public.paid_event_orders
ADD CONSTRAINT paid_event_orders_status_check
CHECK (status = ANY (ARRAY[
  'pending'::text,
  'awaiting_transfer'::text,
  'awaiting_email_confirmation'::text,
  'paid'::text,
  'cancelled'::text,
  'refunded'::text,
  'failed'::text,
  'expired'::text
]));