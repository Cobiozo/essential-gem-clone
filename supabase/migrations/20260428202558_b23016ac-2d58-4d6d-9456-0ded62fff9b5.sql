INSERT INTO public.i18n_translations (language_code, namespace, key, value)
VALUES
  ('pl', 'theme',  'system',            'Systemowy'),
  ('pl', 'footer', 'allRightsReserved', 'Wszelkie prawa zastrzeżone'),
  ('pl', 'footer', 'privacyPolicy',     'Polityka prywatności'),
  ('pl', 'footer', 'terms',             'Regulamin'),
  ('pl', 'footer', 'cookieSettings',    'Ustawienia plików cookie')
ON CONFLICT (language_code, namespace, key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = now();