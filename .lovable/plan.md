

# Plan: Historia CRON 3 dni + podział goście/zalogowani + test emaili

## Dwie rzeczy do zrobienia:

### 1. Historia CRON — rozszerzenie widoku

**Problem:** Obecnie pobiera `limit(20)` bez filtra czasowego, nie pokazuje podziału goście/zalogowani.

**Zmiany w `src/components/admin/CronJobsManagement.tsx`:**
- Zmiana query: zamiast `limit(20)` — filtr `.gte('started_at', 3_dni_wstecz)` bez limitu (lub z limitem ~500)
- Rozszerzenie interfejsu `DetailedResults` o pola `guests`/`users` per kategoria (np. `webinarReminders1h.guests`, `webinarReminders1h.users`)
- Aktualizacja `formatDetailCategory` aby wyświetlał podział: np. `"27 ✓"` → `"15G + 12U ✓"` (G = goście, U = użytkownicy)

**Zmiany w `supabase/functions/process-pending-notifications/index.ts`:**
- Rozszerzenie struktury `results` — każda kategoria webinarowa dostaje dodatkowe pola `guests` i `users`
- Parsowanie odpowiedzi z `send-bulk-webinar-reminders` (już zwraca `guests` i `users`) i zapisywanie ich w `results`
- Te dane trafiają do `details` JSON w `cron_job_logs`

### 2. Test emaili dla byk1023@wp.pl

Po wdrożeniu zmian — wywołanie sekwencji testowych emaili (confirmation, 24h, 12h, 2h, 1h, 15min) jako gość webinarowy.

## Pliki do zmiany:
- `src/components/admin/CronJobsManagement.tsx` — query 3 dni, wyświetlanie G/U
- `supabase/functions/process-pending-notifications/index.ts` — zbieranie guests/users z bulk response
- Deploy: `process-pending-notifications`

