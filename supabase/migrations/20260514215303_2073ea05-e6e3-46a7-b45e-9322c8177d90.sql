-- 1) Pozwól kupującemu widzieć attendees swoich zamówień również po dopasowaniu e-mailem (nie tylko user_id)
CREATE POLICY "Order email owner can view attendees"
  ON public.paid_event_order_attendees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.paid_event_orders o
      WHERE o.id = paid_event_order_attendees.order_id
        AND (
          o.user_id = auth.uid()
          OR lower(o.email) = lower(((SELECT email FROM auth.users WHERE id = auth.uid()))::text)
        )
    )
  );

-- 2) Pozwól kupującemu UPDATE rekordów attendee dla swoich zamówień (frontend i tak ogranicza pola do imię/nazwisko/email)
CREATE POLICY "Order owner can update attendees"
  ON public.paid_event_order_attendees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.paid_event_orders o
      WHERE o.id = paid_event_order_attendees.order_id
        AND (
          o.user_id = auth.uid()
          OR lower(o.email) = lower(((SELECT email FROM auth.users WHERE id = auth.uid()))::text)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.paid_event_orders o
      WHERE o.id = paid_event_order_attendees.order_id
        AND (
          o.user_id = auth.uid()
          OR lower(o.email) = lower(((SELECT email FROM auth.users WHERE id = auth.uid()))::text)
        )
    )
  );

-- 3) Trigger blokujący zmianę pól krytycznych (seat_index, ticket_code, order_id, event_id)
CREATE OR REPLACE FUNCTION public.protect_attendee_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NEW.seat_index IS DISTINCT FROM OLD.seat_index
     OR NEW.ticket_code IS DISTINCT FROM OLD.ticket_code
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.event_id IS DISTINCT FROM OLD.event_id THEN
    -- Admini mogą wszystko
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Cannot modify immutable attendee fields (seat_index, ticket_code, order_id, event_id)';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_attendee_immutable ON public.paid_event_order_attendees;
CREATE TRIGGER trg_protect_attendee_immutable
  BEFORE UPDATE ON public.paid_event_order_attendees
  FOR EACH ROW EXECUTE FUNCTION public.protect_attendee_immutable_fields();