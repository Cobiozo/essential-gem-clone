# Dodanie brakujących tłumaczeń PL

W konsoli pojawiały się ostrzeżenia `[i18n] Missing translation` dla 5 kluczy w języku polskim. Sprawdziłem tabelę `public.i18n_translations` — żaden z tych kluczy nie istnieje (ani w PL, ani w żadnym innym języku). Hook `useTranslations` parsuje klucze formatu `namespace.key` (Strategy 1), więc wpisy trafiają do namespace'ów `theme` i `footer`.

## Co zostanie zrobione

Wstawienie 5 wierszy do `public.i18n_translations` (UPSERT po unikalnym kluczu `language_code, namespace, key`):

| namespace | key                | value (PL)                    |
|-----------|--------------------|-------------------------------|
| theme     | system             | Systemowy                     |
| footer    | allRightsReserved  | Wszelkie prawa zastrzeżone    |
| footer    | privacyPolicy      | Polityka prywatności          |
| footer    | terms              | Regulamin                     |
| footer    | cookieSettings     | Ustawienia plików cookie      |

## SQL

```sql
INSERT INTO public.i18n_translations (language_code, namespace, key, value)
VALUES
  ('pl', 'theme',  'system',            'Systemowy'),
  ('pl', 'footer', 'allRightsReserved', 'Wszelkie prawa zastrzeżone'),
  ('pl', 'footer', 'privacyPolicy',     'Polityka prywatności'),
  ('pl', 'footer', 'terms',             'Regulamin'),
  ('pl', 'footer', 'cookieSettings',    'Ustawienia plików cookie')
ON CONFLICT (language_code, namespace, key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = now();
```

## Uwagi

- Operacja jest tylko na danych (INSERT/UPSERT), bez zmian schematu i bez wpływu na RLS.
- Po zatwierdzeniu cache tłumaczeń (`translationsCache`) zostanie odświeżony przy najbliższym przeładowaniu — ostrzeżenia w konsoli znikną.
- Zakres ograniczam zgodnie z prośbą do języka **pl**. Jeśli chcesz, mogę w kolejnym kroku uzupełnić te same klucze dla pozostałych języków (en/de/es/fr/it/no/pt).
