-- Fix Norwegian position to be last in the list
UPDATE public.i18n_languages SET position = 8 WHERE code = 'no';

-- Add theme.* translation keys
INSERT INTO public.i18n_translations (language_code, namespace, key, value)
VALUES
  ('pl', 'theme', 'light', 'Jasny'),
  ('pl', 'theme', 'dark', 'Ciemny'),
  ('pl', 'theme', 'system', 'Dostosowany do urządzenia'),
  ('pl', 'theme', 'toggle', 'Przełącz motyw'),
  ('en', 'theme', 'light', 'Light'),
  ('en', 'theme', 'dark', 'Dark'),
  ('en', 'theme', 'system', 'System'),
  ('en', 'theme', 'toggle', 'Toggle theme'),
  ('de', 'theme', 'light', 'Hell'),
  ('de', 'theme', 'dark', 'Dunkel'),
  ('de', 'theme', 'system', 'Systemeinstellung'),
  ('de', 'theme', 'toggle', 'Design wechseln'),
  ('no', 'theme', 'light', 'Lys'),
  ('no', 'theme', 'dark', 'Mørk'),
  ('no', 'theme', 'system', 'Systeminnstilling'),
  ('no', 'theme', 'toggle', 'Bytt tema')
ON CONFLICT (language_code, namespace, key) DO NOTHING;