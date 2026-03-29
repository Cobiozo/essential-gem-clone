-- Cancel all legacy registrations that have occurrence_index but lack stable date/time snapshot
-- These are "ghost" registrations that drift to wrong dates when admin edits occurrences
UPDATE public.event_registrations
SET status = 'cancelled', cancelled_at = now()
WHERE status = 'registered'
  AND occurrence_index IS NOT NULL
  AND (occurrence_date IS NULL OR occurrence_time IS NULL);