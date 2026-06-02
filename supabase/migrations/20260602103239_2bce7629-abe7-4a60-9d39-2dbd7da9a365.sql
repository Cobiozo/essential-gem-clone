ALTER TABLE public.paid_event_tickets
ADD COLUMN IF NOT EXISTS allow_multiple_purchase boolean NOT NULL DEFAULT false;