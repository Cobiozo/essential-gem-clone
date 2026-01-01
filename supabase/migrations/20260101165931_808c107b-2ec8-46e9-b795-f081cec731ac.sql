-- Usunięcie nieużywanych indeksów - Etap 2 finalizacji optymalizacji
-- Szacunkowa oszczędność: ~80 KB

-- Indeksy na małych tabelach (5 wierszy) - PostgreSQL preferuje sequential scan
DROP INDEX IF EXISTS idx_system_texts_type;
DROP INDEX IF EXISTS idx_system_texts_is_active;
DROP INDEX IF EXISTS idx_pages_is_published_active;

-- Indeks nieużywany w zapytaniach SELECT (tylko UPDATE)
DROP INDEX IF EXISTS idx_user_cookie_consents_consent_given_at;

-- Indeks nieużywany w filtrach WHERE
DROP INDEX IF EXISTS idx_team_contacts_next_contact_date;