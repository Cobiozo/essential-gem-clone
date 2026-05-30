## Cel

Rozbudować istniejący przycisk „Testuj połączenie” w `/admin/payments` tak, żeby:
1. Wynik testu był czytelny (sukces/błąd, środowisko, kod błędu PayU jeśli jest).
2. Zapisywała się i wyświetlała data ostatniego udanego/nieudanego testu.

## Zakres zmian

### 1. Migracja DB
Do tabeli `public.payu_settings` dodać kolumny:
- `last_test_at timestamptz` — kiedy ostatnio testowano
- `last_test_ok boolean` — wynik
- `last_test_message text` — komunikat (skrót, np. „Połączono — sandbox” lub treść błędu)

### 2. Edge function `payu-test-connection`
Po wykonaniu testu OAuth zapisać wynik do `payu_settings` (service role):
- przy sukcesie: `last_test_ok=true`, message = `Połączono ze środowiskiem: {env}`
- przy błędzie: `last_test_ok=false`, message = treść błędu (skrócona do 300 znaków)
Zwracać dodatkowo `last_test_at` w odpowiedzi.

### 3. `src/pages/PaymentsAdminPage.tsx`
- Przycisk „Testuj połączenie PayU” — wyraźniejszy (variant `default`, ikona `PlugZap`), z loaderem i blokadą gdy brak kompletu danych.
- Pod przyciskiem panel wyniku:
  - Ikona ✅/❌ + tytuł („Połączenie działa” / „Połączenie nie powiodło się”)
  - Środowisko (sandbox/produkcja)
  - Treść błędu (jeśli jest), z kodem PayU gdy zwrócony
  - Linia: „Ostatni test: {data, godzina} ({względnie, np. „2 min temu”})”
- Po wejściu na stronę dociągnąć i pokazać `last_test_at`, `last_test_ok`, `last_test_message` z bazy — żeby widzieć wynik z poprzedniej sesji bez ponownego testowania.
- Badge statusu integracji uzupełnić o trzeci stan: „Skonfigurowane — nieprzetestowane” gdy są dane, ale `last_test_at` puste.
- Switch „Włącz płatności PayU” zablokowany, gdy `last_test_ok !== true` (z tooltipem „Najpierw wykonaj udany test połączenia”).

## Pliki

- `supabase/migrations/<new>.sql` — ALTER TABLE payu_settings (3 kolumny, nullable)
- `supabase/functions/payu-test-connection/index.ts` — zapis wyniku po teście
- `src/pages/PaymentsAdminPage.tsx` — UI wyniku + odczyt z bazy + blokada switcha

Bez zmian w przepływie checkoutu i w innych funkcjach PayU.
