
ALTER TABLE public.paid_event_orders
  ADD COLUMN IF NOT EXISTS account_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_deleted_action text,
  ADD COLUMN IF NOT EXISTS account_deleted_snapshot jsonb;

ALTER TABLE public.paid_event_order_attendees
  ADD COLUMN IF NOT EXISTS account_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_deleted_action text,
  ADD COLUMN IF NOT EXISTS account_deleted_snapshot jsonb;

ALTER TABLE public.event_form_submissions
  ADD COLUMN IF NOT EXISTS account_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_deleted_action text,
  ADD COLUMN IF NOT EXISTS account_deleted_snapshot jsonb;

ALTER TABLE public.guest_event_registrations
  ADD COLUMN IF NOT EXISTS account_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_deleted_action text,
  ADD COLUMN IF NOT EXISTS account_deleted_snapshot jsonb;

CREATE INDEX IF NOT EXISTS idx_paid_event_orders_account_deleted_at ON public.paid_event_orders(account_deleted_at) WHERE account_deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_paid_event_order_attendees_account_deleted_at ON public.paid_event_order_attendees(account_deleted_at) WHERE account_deleted_at IS NOT NULL;
