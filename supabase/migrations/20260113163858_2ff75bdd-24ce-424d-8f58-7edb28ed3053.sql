-- Dodaj nowe kolumny do leader_permissions dla spotkań indywidualnych
ALTER TABLE leader_permissions 
ADD COLUMN IF NOT EXISTS individual_meetings_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tripartite_meeting_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS partner_consultation_enabled boolean DEFAULT false;

-- Komentarze do kolumn
COMMENT ON COLUMN leader_permissions.individual_meetings_enabled IS 'Czy partner ma włączoną funkcję spotkań indywidualnych';
COMMENT ON COLUMN leader_permissions.tripartite_meeting_enabled IS 'Czy partner może prowadzić spotkania trójstronne';
COMMENT ON COLUMN leader_permissions.partner_consultation_enabled IS 'Czy partner może prowadzić konsultacje dla partnerów';