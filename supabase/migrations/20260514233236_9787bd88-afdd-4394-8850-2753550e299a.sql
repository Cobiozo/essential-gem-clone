INSERT INTO public.paid_event_order_attendees (order_id, event_id, seat_index, first_name, last_name, email, ticket_code)
SELECT o.id, o.event_id, 1, o.first_name, o.last_name, o.email,
       upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))
FROM public.paid_event_orders o
WHERE NOT EXISTS (SELECT 1 FROM public.paid_event_order_attendees a WHERE a.order_id = o.id)
  AND COALESCE(o.quantity, 1) = 1;