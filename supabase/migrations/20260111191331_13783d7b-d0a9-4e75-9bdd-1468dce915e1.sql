-- Add translations for new dashboard items
INSERT INTO i18n_translations (language_code, namespace, key, value)
VALUES
  -- PureLinki translations
  ('pl', 'dashboard', 'pureLinki', 'PureLinki'),
  ('en', 'dashboard', 'pureLinki', 'PureLinks'),
  -- InfoLinki translations
  ('pl', 'dashboard', 'menu.infolinks', 'InfoLinki'),
  ('en', 'dashboard', 'menu.infolinks', 'InfoLinks'),
  ('pl', 'dashboard', 'infoLinks', 'InfoLinki'),
  ('en', 'dashboard', 'infoLinks', 'InfoLinks'),
  -- Admin panel translations
  ('pl', 'dashboard', 'menu.admin', 'Panel CMS'),
  ('en', 'dashboard', 'menu.admin', 'CMS Panel'),
  -- Copy action translations
  ('pl', 'dashboard', 'copyLink', 'Kopiuj link'),
  ('en', 'dashboard', 'copyLink', 'Copy link'),
  ('pl', 'dashboard', 'copied', 'Skopiowano!'),
  ('en', 'dashboard', 'copied', 'Copied!'),
  -- Role labels for reflinks
  ('pl', 'dashboard', 'forClient', 'Dla klienta'),
  ('en', 'dashboard', 'forClient', 'For client'),
  ('pl', 'dashboard', 'forPartner', 'Dla partnera'),
  ('en', 'dashboard', 'forPartner', 'For partner'),
  ('pl', 'dashboard', 'forSpecialist', 'Dla specjalisty'),
  ('en', 'dashboard', 'forSpecialist', 'For specialist'),
  -- No links message
  ('pl', 'dashboard', 'noLinks', 'Brak linków'),
  ('en', 'dashboard', 'noLinks', 'No links'),
  ('pl', 'dashboard', 'generateInAccount', 'Wygeneruj w swoim koncie'),
  ('en', 'dashboard', 'generateInAccount', 'Generate in your account')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;