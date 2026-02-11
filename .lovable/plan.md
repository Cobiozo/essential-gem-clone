
# Naprawa duplikowania wydarzen w Google Calendar po ponownym polaczeniu

## Problem
Po rozlaczeniu i ponownym polaczeniu konta Google Calendar, klikniecie "Synchronizuj teraz" tworzy duplikaty wydarzen. Przyczyna:

1. Rozlaczenie usuwa rekordy z tabeli `event_google_sync` (lokalna baza), ale NIE usuwa wydarzen z Google Calendar
2. Po ponownym polaczeniu, "Synchronizuj teraz" wywoluje `action: 'create'` dla kazdego wydarzenia
3. Edge function nie znajduje rekordu w `event_google_sync` (bo zostal usuniety) i tworzy nowe wydarzenie w Google Calendar
4. Wynik: te same wydarzenia istnieja podwojnie w kalendarzu

## Rozwiazanie

### Zmiana 1: Edge function `sync-google-calendar` — sprawdzanie duplikatow przed utworzeniem

W funkcji `processSyncForUser`, przed wywolaniem `createGoogleEvent`, dodanie kroku sprawdzajacego czy w Google Calendar juz istnieje wydarzenie o tym samym tytule i czasie:

1. Przed utworzeniem nowego wydarzenia, wykonaj zapytanie do Google Calendar API (`events.list`) z filtrami:
   - `timeMin` / `timeMax` ustawione na dokladny czas wydarzenia (+/- 1 minuta)
   - `q` (query) ustawione na tytul wydarzenia z sufiksem "- PureLife"
2. Jesli znajdzie pasujace wydarzenie — uzyj jego ID do aktualizacji rekordu w `event_google_sync` zamiast tworzenia nowego
3. Jesli nie znajdzie — utworz normalne nowe wydarzenie

To rozwiazuje problem duplikatow niezaleznie od przyczyny utraty rekordu synchronizacji.

### Zmiana 2: Hook `useGoogleCalendar` — nie usuwaj wydarzen z Google przy rozlaczeniu

W funkcji `disconnect`, zamiast usuwac rekordy z `event_google_sync` (co powoduje utrate informacji o polaczeniu), pozostaw je w bazie. Dzieki temu po ponownym polaczeniu system nadal wie, ktore wydarzenia sa juz zsynchronizowane.

Alternatywnie: oznaczyc rekordy jako "rozlaczone" zamiast je usuwac, aby po reconnect mozna bylo je przywrocic.

### Zmiana 3: Usprawniona logika "Synchronizuj teraz"

Zmiana akcji w `syncAllEvents` z "create" na "upsert" — edge function bedzie:
1. Sprawdzac czy istnieje rekord w `event_google_sync`
2. Jesli tak — aktualizowac wydarzenie w Google Calendar
3. Jesli nie — sprawdzic Google Calendar pod katem duplikatow (Zmiana 1)
4. Dopiero jesli brak duplikatow — utworzyc nowe wydarzenie

## Zakres zmian plikow

1. **`supabase/functions/sync-google-calendar/index.ts`** — nowa funkcja `findExistingGoogleEvent()` szukajaca duplikatow w Google Calendar przed utworzeniem; modyfikacja `processSyncForUser` aby ja wywolywala
2. **`src/hooks/useGoogleCalendar.ts`** — w `disconnect()` nie usuwac rekordow `event_google_sync`; w `syncAllEvents` zmiana logiki na upsert-first

## Efekt
- Po ponownym polaczeniu "Synchronizuj teraz" nie tworzy duplikatow
- Istniejace wydarzenia sa rozpoznawane i aktualizowane zamiast tworzenia nowych
- System jest odporny na utrate rekordow synchronizacji z dowolnej przyczyny
