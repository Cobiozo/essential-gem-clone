-- MUST drop old constraint first before any data changes
ALTER TABLE event_registrations 
DROP CONSTRAINT IF EXISTS event_registrations_event_user_occurrence_key;