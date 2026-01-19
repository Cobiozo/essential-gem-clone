-- Zaktualizuj istniejące rejestracje dla wydarzeń cyklicznych, przypisując occurrence_index = 0
UPDATE event_registrations 
SET occurrence_index = 0 
WHERE occurrence_index IS NULL 
  AND event_id IN (
    SELECT id FROM events WHERE occurrences IS NOT NULL
  );