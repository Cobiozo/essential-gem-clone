-- Dodanie osobnych czasów trwania dla każdego typu spotkania indywidualnego
ALTER TABLE leader_permissions 
ADD COLUMN IF NOT EXISTS tripartite_slot_duration integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS consultation_slot_duration integer DEFAULT 60;

COMMENT ON COLUMN leader_permissions.tripartite_slot_duration IS 'Czas trwania spotkań trójstronnych w minutach';
COMMENT ON COLUMN leader_permissions.consultation_slot_duration IS 'Czas trwania konsultacji w minutach';