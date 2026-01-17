-- Add occurrences column to events table for multi-occurrence events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS occurrences JSONB DEFAULT NULL;

-- Add occurrence_index to event_registrations to track which occurrence user registered for
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS occurrence_index INTEGER DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.events.occurrences IS 'Array of occurrence objects: [{date: "YYYY-MM-DD", time: "HH:MM", duration_minutes: number}]. NULL means single-occurrence event.';
COMMENT ON COLUMN public.event_registrations.occurrence_index IS 'Index of the occurrence in events.occurrences array. NULL for single-occurrence events.';