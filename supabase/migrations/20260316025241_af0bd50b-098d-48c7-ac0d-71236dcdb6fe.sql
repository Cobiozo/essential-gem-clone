INSERT INTO i18n_translations (language_code, namespace, key, value)
VALUES 
  ('pl', 'common', 'teamContacts.eventRegistrations', 'Rejestracje na wydarzenia'),
  ('pl', 'common', 'teamContacts.noRegistrations', 'Brak rejestracji na wydarzenia'),
  ('pl', 'common', 'teamContacts.registeredFor', 'Zarejestrowany na'),
  ('pl', 'common', 'teamContacts.meetings', 'spotkań'),
  ('pl', 'common', 'teamContacts.meeting', 'spotkanie')
ON CONFLICT (language_code, namespace, key) DO NOTHING;