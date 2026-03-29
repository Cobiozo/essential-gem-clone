
-- Add occurrence_date and occurrence_time to event_registrations
-- These create a stable snapshot of which specific date/time the user registered for,
-- so that if admin edits the occurrences array, old registrations won't drift to new dates.
ALTER TABLE public.event_registrations 
  ADD COLUMN IF NOT EXISTS occurrence_date text,
  ADD COLUMN IF NOT EXISTS occurrence_time text;

-- Backfill existing registrations that have an occurrence_index
-- by looking up the corresponding entry in the event's occurrences JSONB array
UPDATE public.event_registrations er
SET 
  occurrence_date = (e.occurrences -> er.occurrence_index) ->> 'date',
  occurrence_time = (e.occurrences -> er.occurrence_index) ->> 'time'
FROM public.events e
WHERE er.event_id = e.id
  AND er.occurrence_index IS NOT NULL
  AND er.occurrence_date IS NULL
  AND e.occurrences IS NOT NULL
  AND jsonb_array_length(e.occurrences) > er.occurrence_index;
