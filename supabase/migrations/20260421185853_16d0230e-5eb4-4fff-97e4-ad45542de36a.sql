INSERT INTO public.i18n_translations (language_code, namespace, key, value) VALUES
  ('pl','teamContacts','toContact','W kolejce - Do skontaktowania'),
  ('en','teamContacts','toContact','In queue - To contact'),
  ('de','teamContacts','toContact','In Warteschlange - Zu kontaktieren'),
  ('no','teamContacts','toContact','I kø - Å kontakte'),
  ('it','teamContacts','toContact','In coda - Da contattare'),
  ('es','teamContacts','toContact','En cola - Por contactar'),
  ('fr','teamContacts','toContact','En file - À contacter'),
  ('pt','teamContacts','toContact','Na fila - A contactar')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;