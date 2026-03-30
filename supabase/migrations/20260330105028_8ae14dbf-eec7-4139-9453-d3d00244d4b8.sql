-- Clean up duplicate NULL date/time rows (keep one per event_id+user_id)
DELETE FROM event_registrations
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY event_id, user_id 
      ORDER BY occurrence_index ASC NULLS FIRST
    ) AS rn
    FROM event_registrations
    WHERE occurrence_date IS NULL AND occurrence_time IS NULL
  ) sub
  WHERE rn > 1
);

-- Clean up duplicate date/time rows (keep registered over cancelled)
DELETE FROM event_registrations
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY event_id, user_id, occurrence_date, occurrence_time
      ORDER BY 
        CASE WHEN status = 'registered' THEN 0 ELSE 1 END,
        registered_at DESC NULLS LAST
    ) AS rn
    FROM event_registrations
    WHERE occurrence_date IS NOT NULL
  ) sub
  WHERE rn > 1
);

-- Fix remaining occurrence_index=3
UPDATE event_registrations 
SET occurrence_index = 0 
WHERE event_id = 'e3363eaf-7c85-493a-aec0-c1faa276df9e' 
AND occurrence_index = 3;

-- New date/time-based unique index
CREATE UNIQUE INDEX event_registrations_event_user_date_time_key 
ON event_registrations (event_id, user_id, occurrence_date, occurrence_time);

-- Partial index for NULL date entries
CREATE UNIQUE INDEX event_registrations_event_user_no_date_key 
ON event_registrations (event_id, user_id) 
WHERE occurrence_date IS NULL AND occurrence_time IS NULL;