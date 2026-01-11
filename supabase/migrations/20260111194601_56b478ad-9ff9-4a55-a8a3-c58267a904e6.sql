INSERT INTO i18n_translations (language_code, namespace, key, value)
VALUES 
  ('pl', 'dashboard', 'infoLinks', 'InfoLinki'),
  ('en', 'dashboard', 'infoLinks', 'Info Links')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;