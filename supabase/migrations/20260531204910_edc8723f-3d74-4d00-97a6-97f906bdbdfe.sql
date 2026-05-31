UPDATE public.paid_event_orders
SET status = 'cancelled', updated_at = now()
WHERE event_id IN (SELECT id FROM public.paid_events WHERE is_free = true)
  AND status IN ('pending','awaiting_transfer')
  AND (payment_provider IS NULL OR payment_provider <> 'free');