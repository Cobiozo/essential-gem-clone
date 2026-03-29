-- Deduplicate: keep newest registration per (user, event, occurrence), cancel the rest
WITH ranked AS (
  SELECT id, 
    ROW_NUMBER() OVER (
      PARTITION BY user_id, event_id, COALESCE(occurrence_date, ''), COALESCE(occurrence_time, '')
      ORDER BY registered_at DESC NULLS LAST, id DESC
    ) as rn
  FROM public.event_registrations
  WHERE status = 'registered'
)
UPDATE public.event_registrations
SET status = 'cancelled', cancelled_at = now()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Create stable unique index
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_event_occurrence_stable 
ON public.event_registrations (user_id, event_id, COALESCE(occurrence_date, ''), COALESCE(occurrence_time, ''))
WHERE status = 'registered';