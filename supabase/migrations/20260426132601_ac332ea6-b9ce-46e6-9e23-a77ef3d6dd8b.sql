-- Fix legacy paid_events datetimes that were saved as naive Europe/Warsaw wall-clock
-- but stored in timestamptz columns as if they were UTC.
-- We re-interpret each existing value as Europe/Warsaw local time and convert it to the
-- correct UTC instant. AT TIME ZONE 'Europe/Warsaw' on a naive timestamp yields the
-- correct timestamptz, automatically respecting DST transitions per row.
UPDATE public.paid_events
SET
  event_date = (event_date::timestamp AT TIME ZONE 'Europe/Warsaw'),
  event_end_date = CASE
    WHEN event_end_date IS NOT NULL
      THEN (event_end_date::timestamp AT TIME ZONE 'Europe/Warsaw')
    ELSE NULL
  END
WHERE event_date IS NOT NULL;