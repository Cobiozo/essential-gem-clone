-- Delete legacy registrations where user has newer specific occurrence registrations
-- This cleans up old registrations with NULL occurrence_index when user has specific occurrence registrations
DELETE FROM event_registrations legacy
WHERE legacy.occurrence_index IS NULL
  AND legacy.status = 'registered'
  AND EXISTS (
    SELECT 1 FROM event_registrations specific
    WHERE specific.event_id = legacy.event_id
      AND specific.user_id = legacy.user_id
      AND specific.occurrence_index IS NOT NULL
  );