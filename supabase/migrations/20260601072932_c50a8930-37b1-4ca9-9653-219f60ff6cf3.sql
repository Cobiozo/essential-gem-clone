-- Server-side helper to reliably fetch the logged-in user's orders for a given event.
-- Avoids any RLS/email casing edge cases by matching on user_id OR lower(email)=lower(auth email).
CREATE OR REPLACE FUNCTION public.get_my_event_orders(p_event_id uuid)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  ticket_id uuid,
  user_id uuid,
  email text,
  quantity integer,
  total_amount integer,
  status text,
  payment_provider text,
  ticket_code text,
  email_confirmed_at timestamptz,
  created_at timestamptz,
  ticket_name text,
  seats_per_ticket integer,
  attendees jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  WITH me AS (
    SELECT auth.uid() AS uid,
           lower((SELECT u.email FROM auth.users u WHERE u.id = auth.uid())::text) AS em
  )
  SELECT
    o.id, o.event_id, o.ticket_id, o.user_id, o.email,
    o.quantity, o.total_amount, o.status, o.payment_provider,
    o.ticket_code, o.email_confirmed_at, o.created_at,
    t.name AS ticket_name,
    COALESCE(t.seats_per_ticket, 1) AS seats_per_ticket,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id,
        'seat_index', a.seat_index,
        'first_name', a.first_name,
        'last_name', a.last_name,
        'email', a.email,
        'ticket_code', a.ticket_code
      ) ORDER BY a.seat_index)
      FROM public.paid_event_order_attendees a
      WHERE a.order_id = o.id
    ), '[]'::jsonb) AS attendees
  FROM public.paid_event_orders o
  LEFT JOIN public.paid_event_tickets t ON t.id = o.ticket_id
  CROSS JOIN me
  WHERE o.event_id = p_event_id
    AND auth.uid() IS NOT NULL
    AND (o.user_id = me.uid OR lower(o.email) = me.em)
  ORDER BY o.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_event_orders(uuid) TO authenticated;