## Problem

Wszystko, co zrobiłem w ostatnich planach (komplet pól PayU: `client_id`, `client_secret`, `md5_key`, `second_md5_key`; walidacja; przycisk „Testuj połączenie PayU”; panel wyniku z datą; blokada switcha bez udanego testu), trafiło na **osobną stronę `/admin/payments`** (`src/pages/PaymentsAdminPage.tsx`, tabela `payu_settings`).

Ty pracujesz w **`/admin?tab=paid-events` → zakładka Ustawienia** (`src/components/admin/paid-events/PaidEventsSettings.tsx`), która ma własny stary mini-panel PayU oparty o tabelę `paid_events_settings` (tylko `payu_environment`, `payu_merchant_id`, `payu_pos_id`, bez sekretów, bez testu). Stąd „nic tu nie ma”.

## Co zrobię

Przenoszę całą logikę PayU do `PaidEventsSettings.tsx`, żeby było w jednym miejscu, którego faktycznie używasz.

### 1. `PaidEventsSettings.tsx` — przebudowa sekcji „Ustawienia ogólne”

Zostawiam: switch „Moduł aktywny”, „Domyślna waluta”, oraz całą sekcję „Dane firmy” i „Widoczność” bez zmian (czytają z `paid_events_settings`).

Usuwam stare pola: `PayU Merchant ID`, `PayU POS ID`, `Środowisko PayU` z `paid_events_settings` (te zostają w bazie, ale znikają z UI — żeby nie dublować).

Dodaję nową kartę „Konfiguracja PayU” czytającą/zapisującą do `payu_settings` (singleton):
- Pola: środowisko (sandbox/production), `pos_id`, `client_id`, `client_secret` (password), `md5_key` (password), `second_md5_key` (password, opcjonalne).
- Wskaźnik kompletności: badge „Brak danych” / „Skonfigurowane — nieprzetestowane” / „Połączenie działa” / „Test nieudany”.
- Switch „Włącz płatności PayU” (`is_enabled`) zablokowany, gdy `fullyConfigured && last_test_ok === true` jest nie spełnione — tooltip: „Najpierw wykonaj udany test połączenia”.
- Przycisk **„Testuj połączenie PayU”** (ikona `PlugZap`, loader) — wywołuje `payu-test-connection` (już istnieje, zapisuje wynik do `payu_settings.last_test_*`).
- Panel wyniku: ✅/❌, środowisko, treść błędu jeśli jest, „Ostatni test: {data, godzina} ({względnie})” (date-fns/pl). Dane czytane z bazy przy wejściu (`last_test_at`, `last_test_ok`, `last_test_message`).
- Przycisk „Zapisz konfigurację PayU” (osobny od „Zapisz ustawienia ogólne”).

### 2. `/admin/payments` (`PaymentsAdminPage.tsx`)

Bez zmian — pozostaje jako dodatkowy wgląd (czyta tę samą tabelę `payu_settings`).

### 3. Bez zmian w bazie i edge functions

Tabela `payu_settings` + kolumny `last_test_at/ok/message` już istnieją (poprzednia migracja). Edge function `payu-test-connection` już persystuje wynik.

## Pliki

- `src/components/admin/paid-events/PaidEventsSettings.tsx` — usunięcie starych pól PayU + dodanie pełnej karty „Konfiguracja PayU” z testem i walidacją.

Bez zmian w innych miejscach.
