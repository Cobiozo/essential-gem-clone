
Problem nie wynika z tego, że BO i HC korzystają z tych samych danych. One są rozdzielone poprawnie przez `category` i mają osobne `auto_webinar_config` oraz osobne `event_id`. Błąd jest w publicznym odtwarzaczu, który źle interpretuje nowy format slotu.

Co znalazłem
- Rejestracja i generator linków używają nowego formatu slotu: `YYYY-MM-DD_HH:MM`.
- `EventRegistrationBySlug.tsx` i `EventGuestRegistration.tsx` już ten format rozumieją.
- Ale `useAutoWebinarSync.ts` nadal traktuje `guestSlotTime` jak samo `HH:MM`.
- W efekcie dla linku typu `2026-03-27_11:30` funkcja `parseTimeToSeconds()` dostaje zły string, wylicza błędny czas i player wpada w stan `isRoomClosed`, dlatego widzisz komunikat „Spotkanie już się odbyło”.

Dowód w kodzie
- `AutoWebinarPublicPage.tsx` przekazuje do playera całe `searchParams.get('slot')`
- `useAutoWebinarSync.ts` robi:
  - `const guestSlotSec = parseTimeToSeconds(guestSlotTime);`
  - a `parseTimeToSeconds()` oczekuje tylko `HH:MM`
- Dla HC konfiguracja ma slot `11:30`, dla BO inne sloty; oba eventy są aktywne i rozdzielone, więc problem jest wspólny dla parsera slotu, nie dla danych wydarzeń.

Plan naprawy
1. Ujednolicić parsowanie slotu w `useAutoWebinarSync.ts`
- dodać parser obsługujący oba formaty:
  - `HH:MM`
  - `YYYY-MM-DD_HH:MM`
- dla linków gościa wyliczać czas względem pełnej daty i godziny, nie względem „sekund od północy”.

2. Poprawić logikę wygasania dla linków gościa
- liczyć:
  - czas do startu,
  - czas od startu,
  - zakończenie filmu,
  - ekran podziękowania,
  - zamknięcie pokoju
  na podstawie pełnego `Date`, a nie samej godziny.
- to naprawi zarówno bieżący slot 11:30, jak i wszystkie kolejne dni.

3. Zachować zgodność wsteczną
- stare linki `?slot=11:30` nadal mogą być obsłużone jako legacy albo zablokowane zgodnie z obecną polityką,
- ale nowy flow publiczny ma działać poprawnie dla datowanych linków.

4. Sprawdzić mapowanie slot → video
- obecnie wybór filmu opiera się o `slotHours.indexOf(...)`
- trzeba porównywać z samą częścią czasu (`11:30`), gdy link zawiera datę (`2026-03-27_11:30`), żeby wybierał właściwe wideo dla BO i HC.

5. Uporządkować komunikaty końcowe
- upewnić się, że:
  - przed startem jest countdown,
  - w trakcie jest player,
  - po filmie jest ekran „Dziękujemy”,
  - dopiero po zamknięciu pokoju jest „Spotkanie już się odbyło”.

Pliki do zmiany
- `src/hooks/useAutoWebinarSync.ts` — główna naprawa parsera i kalkulacji czasu
- opcjonalnie lekki cleanup w `src/components/auto-webinar/AutoWebinarEmbed.tsx` tylko jeśli trzeba uprościć warunki renderowania po poprawce sync hooka

Efekt po wdrożeniu
- linki BO i HC z `?slot=2026-03-27_11:30` przestaną być od razu uznawane za zakończone,
- oba auto-webinary pozostaną oddzielne,
- status pokoju będzie liczony poprawnie dla konkretnej daty i godziny z linku.
