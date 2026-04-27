# Historia powiadomień w Bazie testów

Dodam ekran „Historia powiadomień", który pokaże dla każdego klienta i testu kiedy wysłano przypomnienia +25d / +120d, do kogo (partner / klient / in-app), oraz czy dostarczenie e-mail się powiodło.

## 1. Baza danych (migracja)

Nowa tabela `omega_test_reminder_log` — pełen audyt każdej próby wysyłki:

- `id uuid pk`
- `test_id uuid` → `omega_tests(id)` ON DELETE CASCADE
- `client_id uuid` → `omega_test_clients(id)` ON DELETE CASCADE
- `user_id uuid` (partner — właściciel, do RLS)
- `kind text` — `'25d' | '120d'`
- `channel text` — `'in_app' | 'email_partner' | 'email_client'`
- `recipient text` (e-mail lub `null` dla in-app)
- `status text` — `'sent' | 'failed' | 'skipped'`
- `error text` (opcjonalnie powód błędu / pominięcia, np. „brak e-maila klienta", „SMTP nieskonfigurowane")
- `sent_at timestamptz default now()`

RLS: SELECT tylko dla `auth.uid() = user_id`; INSERT tylko z service_role (Edge Function). Indeksy na `(test_id)`, `(client_id)`, `(user_id, sent_at desc)`.

## 2. Edge Function `process-omega-test-reminders`

Rozszerzę o logowanie KAŻDEJ próby (zamiast tylko cichego `sendSmtp`):

- Po insert in-app notyfikacji → log `channel='in_app'`, `status='sent'/'failed'`.
- E-mail partnera: log `channel='email_partner'` z `status` zwróconym z `sendSmtp` (zwraca `boolean`). Jeśli `notify_partner_email=false` → log `skipped` z `error='opt_out'`. Jeśli SMTP nie gotowe → `skipped`/`error='smtp_not_configured'`.
- E-mail klienta: analogicznie + `skipped`/`error='no_client_email'` gdy brak adresu.
- Pola `reminder_25d_sent_at` / `reminder_120d_sent_at` ustawiane są tak jak teraz (po pętli kanałów), więc CRON nie będzie powtarzał wysyłek.

## 3. Frontend

### Nowy komponent `ReminderHistoryList.tsx` (`src/components/omega-tests/`)
- Props: `{ testId?: string; clientId?: string }` — jeden z dwóch obowiązkowy.
- Hook `useOmegaTestReminderLog({ testId, clientId })` — pobiera logi z RLS-bezpiecznej tabeli, sortowane `sent_at desc`.
- Widok: tabela / lista z kolumnami: Data, Rodzaj (`+25 dni` / `+120 dni`), Kanał (chip: In-app / E-mail partner / E-mail klient), Odbiorca, Status (badge: Wysłano / Błąd / Pominięto + tooltip z `error`).
- Empty state: „Brak wysłanych powiadomień. Pierwsze wyślą się automatycznie po +25 dniach od daty testu."

### Integracja w istniejących widokach
- **`ClientDetailDrawer.tsx`**: nowa zakładka „Historia powiadomień" obok aktualnej zawartości — pokazuje wszystkie logi danego klienta (`clientId`).
- **`OmegaTestHistory.tsx`** (lista testów): w wierszu testu klienta dodaję przycisk „Powiadomienia" otwierający Dialog z `<ReminderHistoryList testId={...} />`.

## 4. Szczegóły techniczne
- `useOmegaTestReminderLog` używa `useQuery` z kluczem `['omega-reminder-log', testId ?? clientId]`, refetch na otwarcie drawer/dialog.
- Realtime nie wymagany — log uzupełniany raz dziennie (CRON 06:00 CET); wystarczy invalidacja po manualnym odświeżeniu.
- Typy Supabase regenerują się automatycznie po migracji.

## 5. Pliki
- Migracja: tabela + RLS + indeksy.
- `supabase/functions/process-omega-test-reminders/index.ts` — dopisanie logowania.
- Nowe: `src/hooks/useOmegaTestReminderLog.ts`, `src/components/omega-tests/ReminderHistoryList.tsx`.
- Edycja: `src/components/omega-tests/ClientDetailDrawer.tsx`, `src/components/omega-tests/OmegaTestHistory.tsx`.

Po zatwierdzeniu wykonam migrację, zaktualizuję Edge Function i dodam UI.
