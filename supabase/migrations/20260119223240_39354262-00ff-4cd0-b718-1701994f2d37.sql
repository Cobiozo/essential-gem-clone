-- Usunięcie starego constraint (event_id, user_id)
ALTER TABLE event_registrations 
DROP CONSTRAINT IF EXISTS event_registrations_event_id_user_id_key;

-- Dodanie nowego constraint z occurrence_index
ALTER TABLE event_registrations 
ADD CONSTRAINT event_registrations_event_user_occurrence_key 
UNIQUE (event_id, user_id, occurrence_index);

-- Usunięcie anulowanych rejestracji dla wydarzeń cyklicznych (czyszczenie)
DELETE FROM event_registrations 
WHERE status = 'cancelled' 
  AND event_id IN (
    SELECT id FROM events WHERE occurrences IS NOT NULL
  );