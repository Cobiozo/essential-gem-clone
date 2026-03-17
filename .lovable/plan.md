
Problem jest realny i krytyczny: obecny system nie daje gwarancji dostarczenia maili 1h i 15min z linkiem.

Co ustaliłem
- Sama funkcja wysyłki działa: w logach i `email_logs` są poprawne wysyłki `reminder_1h` i `reminder_15min`.
- Problem leży w orkiestracji, nie w SMTP.
- `process-pending-notifications` uruchamia przypomnienia webinarowe wyłącznie przez `send-bulk-webinar-reminders`.
- Ten bulk działa tylko na `guest_event_registrations`, więc zalogowani użytkownicy nie mają pełnej, symetrycznej ścieżki dla wszystkich okien.
- Dodatkowo krytyczne reminder-y 1h/15min zależą od pojedynczego CRON-a co 5 min oraz dodatkowego checku `last_run_at` w samej funkcji. To tworzy ryzyko „minięcia okna” po ręcznym uruchomieniu, opóźnieniu joba albo driftcie czasu.
- W bazie `event_registrations` nie ma kolumn `reminder_1h_sent` ani `reminder_15min_sent`, więc nawet gdybyśmy chcieli poprawnie deduplikować wysyłki dla zalogowanych, dziś nie ma do tego pełnego modelu danych.

Plan naprawy
1. Uczynię 1h i 15min ścieżkami „must deliver”, niezależnymi od pojedynczego przebiegu CRON.
2. Rozszerzę logikę przypomnień tak, by 1h i 15min były wysyłane zarówno do:
   - gości z `guest_event_registrations`
   - zalogowanych z `event_registrations`
3. Dodam brakujące flagi śledzenia do `event_registrations`:
   - `reminder_1h_sent`, `reminder_1h_sent_at`
   - `reminder_15min_sent`, `reminder_15min_sent_at`
   - przy okazji warto ujednolicić też `12h` i `2h`, żeby cały model był spójny
4. Przebuduję `send-bulk-webinar-reminders`, aby:
   - obsługiwał obie tabele rejestracji
   - dla zalogowanych pobierał email i imię z profilu
   - ustawiał odpowiednie flagi po sukcesie
   - logował każdy send do `email_logs`
5. W `process-pending-notifications` usunę lukę niezawodności:
   - krytyczne okna 1h i 15min nie będą mogły zostać pominięte przez dodatkowy guard interwału po ręcznym triggerze
   - logika okien zostanie utrzymana szeroka, ale bardziej odporna na opóźnienia
6. Dodam fallback bezpieczeństwa:
   - jeśli użytkownik zapisze się krótko przed startem, system już teraz próbuje wysłać link od razu; dopnę tę logikę do spójnych flag i deduplikacji, żeby nie było ani luk, ani dubli
7. Po wdrożeniu zweryfikuję na danych:
   - czy event trafia w okno 1h/15min
   - czy powstają wpisy w `email_logs`
   - czy flagi w rejestracjach ustawiają się poprawnie
   - czy link jest obecny w treści dla 1h i 15min

Pliki do zmiany
- `supabase/functions/process-pending-notifications/index.ts`
- `supabase/functions/send-bulk-webinar-reminders/index.ts`
- migracja SQL dla `event_registrations` z brakującymi flagami reminderów
- możliwie drobna korekta w `send-webinar-confirmation/index.ts`, jeśli będzie potrzebna do pełnej deduplikacji i fallbacku

Efekt po wdrożeniu
- maile 1h i 15min z linkiem będą miały podwójne zabezpieczenie: poprawną ścieżkę danych + odporniejszy scheduler
- system przestanie zależeć od „idealnego” pojedynczego trafienia CRON w wąskie okno
- goście i zalogowani będą obsługiwani spójnie

Technicznie najważniejsze
- Root cause nie wygląda na problem SMTP ani domeny.
- Root cause to kombinacja:
  - niepełnej obsługi `event_registrations`
  - zbyt kruchej orkiestracji czasowej
  - brakujących flag deduplikacyjnych dla zalogowanych
- To wymaga poprawki kodu i małej migracji bazy, nie tylko ponownego testu.
