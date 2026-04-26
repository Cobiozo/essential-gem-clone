-- Deduplicate event_form_submissions by (form_id, lower(email)).
-- Keep the most recent row, aggregate order_ids from older duplicates onto the kept row,
-- delete duplicates, add a unique index, and refresh partner submission counts.

WITH ranked AS (
  SELECT
    id,
    form_id,
    lower(email) AS lemail,
    submitted_data,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY form_id, lower(email)
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.event_form_submissions
  WHERE email IS NOT NULL AND email <> ''
),
keepers AS (
  SELECT id, form_id, lemail FROM ranked WHERE rn = 1
),
loser_orders AS (
  -- Collect all order_ids from duplicate rows (rn > 1) per (form_id, lemail)
  SELECT
    r.form_id,
    r.lemail,
    jsonb_agg(DISTINCT (r.submitted_data->>'order_id')) FILTER (
      WHERE r.submitted_data ? 'order_id' AND (r.submitted_data->>'order_id') IS NOT NULL
    ) AS dup_order_ids
  FROM ranked r
  WHERE r.rn > 1
  GROUP BY r.form_id, r.lemail
)
UPDATE public.event_form_submissions s
SET submitted_data = COALESCE(s.submitted_data, '{}'::jsonb)
  || jsonb_build_object(
       'order_ids',
       (
         SELECT jsonb_agg(DISTINCT v)
         FROM (
           SELECT jsonb_array_elements_text(
             COALESCE(s.submitted_data->'order_ids', '[]'::jsonb)
           ) AS v
           UNION
           SELECT s.submitted_data->>'order_id' WHERE s.submitted_data ? 'order_id'
           UNION
           SELECT jsonb_array_elements_text(lo.dup_order_ids)
         ) all_ids
         WHERE v IS NOT NULL
       )
     )
FROM keepers k
JOIN loser_orders lo
  ON lo.form_id = k.form_id AND lo.lemail = k.lemail
WHERE s.id = k.id;

-- Delete the duplicates (keep rn=1)
DELETE FROM public.event_form_submissions s
USING (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY form_id, lower(email)
        ORDER BY created_at DESC, id DESC
      ) AS rn
    FROM public.event_form_submissions
    WHERE email IS NOT NULL AND email <> ''
  ) ranked
  WHERE rn > 1
) dups
WHERE s.id = dups.id;

-- Hard guarantee: one submission per (form_id, lower(email))
CREATE UNIQUE INDEX IF NOT EXISTS event_form_submissions_form_email_unique
  ON public.event_form_submissions (form_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';

-- Recalculate submission_count on partner links from current submissions.
UPDATE public.paid_event_partner_links pl
SET submission_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT pl2.id AS link_id, COUNT(s.id) AS cnt
  FROM public.paid_event_partner_links pl2
  LEFT JOIN public.event_form_submissions s
    ON s.partner_link_id = pl2.id
  GROUP BY pl2.id
) sub
WHERE pl.id = sub.link_id
  AND pl.submission_count <> COALESCE(sub.cnt, 0);