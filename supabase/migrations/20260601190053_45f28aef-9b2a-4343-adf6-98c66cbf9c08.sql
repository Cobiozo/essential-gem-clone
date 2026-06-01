-- Allow 'confirmed' as a valid email_status value used by the free-event
-- confirmation flow (was previously not in the CHECK whitelist).
ALTER TABLE public.event_form_submissions
  DROP CONSTRAINT IF EXISTS event_form_submissions_email_status_check;

ALTER TABLE public.event_form_submissions
  ADD CONSTRAINT event_form_submissions_email_status_check
  CHECK (email_status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'bounced'::text, 'confirmed'::text]));

-- Backfill: link the existing free-event order back onto its submission so the
-- admin panel stops showing a duplicate row for the same guest.
UPDATE public.event_form_submissions s
SET submitted_data = coalesce(s.submitted_data, '{}'::jsonb)
                      || jsonb_build_object('order_id', o.id, 'order_ids', jsonb_build_array(o.id)),
    payment_status = 'paid',
    email_status = 'confirmed',
    email_confirmed_at = coalesce(s.email_confirmed_at, o.email_confirmed_at, now())
FROM public.paid_event_orders o
WHERE o.event_id = s.event_id
  AND lower(o.email) = lower(s.email)
  AND s.email_confirmed_at IS NOT NULL
  AND (
    NOT (coalesce(s.submitted_data, '{}'::jsonb) ? 'order_id')
    OR s.payment_status <> 'paid'
    OR s.email_status <> 'confirmed'
  );