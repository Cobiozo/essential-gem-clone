-- Dodanie kolumny meeting_type do leader_availability
ALTER TABLE leader_availability 
ADD COLUMN IF NOT EXISTS meeting_type text DEFAULT 'both';

-- Komentarz wyjaśniający
COMMENT ON COLUMN leader_availability.meeting_type IS 
  'Typ spotkania: tripartite, consultation, lub both (dla wstecznej kompatybilności)';

-- Indeks dla szybszego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_leader_availability_meeting_type 
ON leader_availability(meeting_type);

-- Dodanie kolumny do date exceptions
ALTER TABLE leader_availability_exceptions
ADD COLUMN IF NOT EXISTS meeting_type text DEFAULT 'both';

COMMENT ON COLUMN leader_availability_exceptions.meeting_type IS 
  'Typ spotkania: tripartite, consultation, lub both';