-- Backfill event_form_submissions from existing paid_event_orders
-- so historical ticket-order registrations appear in the admin
-- "Formularze → Zgłoszenia" view (Goście / Partnerzy tabs).

WITH active_forms AS (
  SELECT DISTINCT ON (event_id) id AS form_id, event_id
  FROM public.event_registration_forms
  WHERE is_active = true
  ORDER BY event_id, created_at ASC
),
candidate_orders AS (
  SELECT
    o.id AS order_id,
    o.event_id,
    af.form_id,
    o.user_id,
    o.email,
    o.first_name,
    o.last_name,
    o.phone,
    o.ticket_id,
    o.quantity,
    o.total_amount,
    o.status,
    o.created_at
  FROM public.paid_event_orders o
  JOIN active_forms af ON af.event_id = o.event_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.event_form_submissions s
    WHERE s.form_id = af.form_id
      AND lower(s.email) = lower(o.email)
  )
),
resolved AS (
  SELECT
    co.*,
    pl.id AS partner_link_id,
    COALESCE(pl.partner_user_id, co.user_id) AS partner_user_id
  FROM candidate_orders co
  LEFT JOIN LATERAL (
    SELECT id, partner_user_id
    FROM public.paid_event_partner_links
    WHERE form_id = co.form_id
      AND partner_user_id = co.user_id
      AND is_active = true
    LIMIT 1
  ) pl ON co.user_id IS NOT NULL
)
INSERT INTO public.event_form_submissions (
  form_id, event_id,
  first_name, last_name, email, phone,
  partner_user_id, partner_link_id,
  payment_status, email_status,
  submitted_data, created_at
)
SELECT
  r.form_id, r.event_id,
  NULLIF(trim(r.first_name), ''),
  NULLIF(trim(r.last_name), ''),
  lower(trim(r.email)),
  NULLIF(trim(coalesce(r.phone, '')), ''),
  r.partner_user_id,
  r.partner_link_id,
  CASE
    WHEN r.status IN ('paid','completed') THEN 'paid'
    WHEN r.status IN ('cancelled','canceled','failed') THEN 'cancelled'
    WHEN r.status = 'refunded' THEN 'refunded'
    ELSE 'pending'
  END,
  'sent',
  jsonb_build_object(
    'source', 'ticket_order',
    'order_id', r.order_id,
    'ticket_id', r.ticket_id,
    'quantity', r.quantity,
    'total_amount', r.total_amount
  ),
  r.created_at
FROM resolved r;

-- Refresh submission_count on partner links to reflect mirrored rows
UPDATE public.paid_event_partner_links pl
SET submission_count = sub.cnt
FROM (
  SELECT partner_link_id, COUNT(*) AS cnt
  FROM public.event_form_submissions
  WHERE partner_link_id IS NOT NULL
  GROUP BY partner_link_id
) sub
WHERE pl.id = sub.partner_link_id
  AND pl.submission_count <> sub.cnt;