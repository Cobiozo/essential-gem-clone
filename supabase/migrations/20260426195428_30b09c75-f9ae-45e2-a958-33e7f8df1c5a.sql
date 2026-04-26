-- 1) Backfill ref_code -> profiles.eq_id where available, only when no conflict per form
UPDATE public.paid_event_partner_links AS l
SET ref_code = p.eq_id
FROM public.profiles AS p
WHERE p.id = l.partner_user_id
  AND p.eq_id IS NOT NULL
  AND length(trim(p.eq_id)) > 0
  AND l.ref_code <> p.eq_id
  AND NOT EXISTS (
    SELECT 1 FROM public.paid_event_partner_links AS l2
    WHERE l2.form_id = l.form_id
      AND l2.ref_code = p.eq_id
      AND l2.id <> l.id
  );

-- 2) Drop the global UNIQUE on ref_code
ALTER TABLE public.paid_event_partner_links
  DROP CONSTRAINT IF EXISTS paid_event_partner_links_ref_code_key;

-- 3) Add per-form uniqueness on (form_id, ref_code)
ALTER TABLE public.paid_event_partner_links
  ADD CONSTRAINT paid_event_partner_links_form_ref_unique UNIQUE (form_id, ref_code);

-- 4) Helpful uniqueness for upserts: one link per partner per form
ALTER TABLE public.paid_event_partner_links
  ADD CONSTRAINT paid_event_partner_links_partner_form_unique UNIQUE (partner_user_id, form_id);