-- Add all dashboard translations
INSERT INTO i18n_translations (language_code, namespace, key, value)
VALUES 
  -- Community translations
  ('pl', 'dashboard', 'menu.community', 'Społeczność'),
  ('en', 'dashboard', 'menu.community', 'Community'),
  ('de', 'dashboard', 'menu.community', 'Gemeinschaft'),
  
  -- Pure-Kontakty and submenu translations
  ('pl', 'dashboard', 'menu.pureContacts', 'Pure-Kontakty'),
  ('en', 'dashboard', 'menu.pureContacts', 'Pure-Contacts'),
  ('de', 'dashboard', 'menu.pureContacts', 'Pure-Kontakte'),
  
  ('pl', 'dashboard', 'menu.privateContacts', 'Kontakty prywatne'),
  ('en', 'dashboard', 'menu.privateContacts', 'Private contacts'),
  ('de', 'dashboard', 'menu.privateContacts', 'Private Kontakte'),
  
  ('pl', 'dashboard', 'menu.teamContacts', 'Członkowie zespołu'),
  ('en', 'dashboard', 'menu.teamContacts', 'Team members'),
  ('de', 'dashboard', 'menu.teamContacts', 'Teammitglieder'),
  
  ('pl', 'dashboard', 'menu.searchSpecialist', 'Szukaj specjalistę'),
  ('en', 'dashboard', 'menu.searchSpecialist', 'Search specialist'),
  ('de', 'dashboard', 'menu.searchSpecialist', 'Spezialist suchen'),
  
  -- Team widget title
  ('pl', 'dashboard', 'team', 'Zespół'),
  ('en', 'dashboard', 'team', 'Team'),
  ('de', 'dashboard', 'team', 'Team')
  
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;

-- Update "Zasoby" to "Biblioteka"
UPDATE i18n_translations 
SET value = 'Biblioteka', updated_at = now()
WHERE language_code = 'pl' AND namespace = 'dashboard' AND key = 'menu.resources';

UPDATE i18n_translations 
SET value = 'Library', updated_at = now()
WHERE language_code = 'en' AND namespace = 'dashboard' AND key = 'menu.resources';

UPDATE i18n_translations 
SET value = 'Bibliothek', updated_at = now()
WHERE language_code = 'de' AND namespace = 'dashboard' AND key = 'menu.resources';