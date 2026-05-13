
ALTER TABLE public.paid_event_tickets
  ADD COLUMN IF NOT EXISTS seats_per_ticket INT NOT NULL DEFAULT 1
  CHECK (seats_per_ticket BETWEEN 1 AND 50);

CREATE TABLE IF NOT EXISTS public.paid_event_order_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.paid_event_orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.paid_events(id) ON DELETE CASCADE,
  seat_index INT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NULL,
  ticket_code TEXT NOT NULL UNIQUE,
  checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, seat_index)
);

CREATE INDEX IF NOT EXISTS idx_paid_event_order_attendees_order ON public.paid_event_order_attendees(order_id);
CREATE INDEX IF NOT EXISTS idx_paid_event_order_attendees_event_code ON public.paid_event_order_attendees(event_id, ticket_code);

ALTER TABLE public.paid_event_order_attendees ENABLE ROW LEVEL SECURITY;

-- SELECT: właściciel zamówienia
CREATE POLICY "Order owner can view attendees"
ON public.paid_event_order_attendees
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.paid_event_orders o
    WHERE o.id = paid_event_order_attendees.order_id
      AND o.user_id = auth.uid()
  )
);

-- SELECT: admin
CREATE POLICY "Admins can view all attendees"
ON public.paid_event_order_attendees
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Trigger updated_at
CREATE TRIGGER update_paid_event_order_attendees_updated_at
BEFORE UPDATE ON public.paid_event_order_attendees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
