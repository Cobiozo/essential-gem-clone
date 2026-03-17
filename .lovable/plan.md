

# Plan: Naprawa duplikowania emaili przypomnień 24h

## Przyczyna

Potwierdzam — problem **nie jest spowodowany przenoszeniem plików na produkcję**. Przyczyną jest bug w edge function `send-bulk-webinar-reminders`.

### Dokładny mechanizm błędu:

1. CRON (`process-pending-notifications`) uruchamia się co **5 minut**
2. Dla przypomnień 24h, konfiguracja wskazuje kolumny:
   - `userFlagColumn: "reminder_sent"` — **istnieje** w tabeli `event_registrations`
   - `userFlagAtColumn: "reminder_sent_at"` — **NIE ISTNIEJE** w tabeli
3. Po wysłaniu emaila, kod próbuje zaktualizować obie kolumny jednocześnie:
   ```typescript
   { reminder_sent: true, reminder_sent_at: "2026-03-17T..." }
   ```
4. PostgREST **odrzuca cały update** bo kolumna `reminder_sent_at` nie istnieje
5. Flaga `reminder_sent` zostaje `false` → następny cykl CRON (za 5 min) wysyła email ponownie

**Dowód z bazy**: Rejestracja `a28c83c7...` ma `reminder_sent = false` mimo 6 wysłanych emaili w logach.

Okno 24h trwa 2 godziny (23h-25h przed eventem), CRON co 5 min = potencjalnie **24 duplikaty** na osobę.

## Naprawa

### 1. Migracja SQL — dodać brakującą kolumnę
Dodać `reminder_sent_at` (timestamp, nullable) do tabeli `event_registrations`. To sprawi, że istniejący kod edge function będzie poprawnie aktualizował flagę.

### 2. Jednorazowa naprawa — oznaczyć już wysłane przypomnienia
Ustawić `reminder_sent = true` dla wszystkich rejestracji na event `58aac028...` które mają logi w `email_logs` z typem `webinar_reminder_24h`. To zapobiegnie kolejnym duplikatom przy następnym uruchomieniu CRON.

### 3. Brak zmian w edge function
Kod `send-bulk-webinar-reminders` jest poprawny — problem leży wyłącznie w brakującej kolumnie bazy danych. Po dodaniu kolumny, flagi będą się prawidłowo aktualizować i każde przypomnienie będzie wysyłane tylko raz.

## Pliki do zmiany
- Migracja SQL (nowa) — `ALTER TABLE event_registrations ADD COLUMN reminder_sent_at timestamptz`
- Migracja SQL (jednorazowa) — `UPDATE event_registrations SET reminder_sent = true WHERE ...`

