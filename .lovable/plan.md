
Krótka odpowiedź: nie, jeszcze nie w pełni wstecznie.

Potwierdziłem, że problem nadal istnieje z dwóch powodów:
1. W bazie dalej są stare aktywne rejestracje legacy bez snapshotu terminu:
   - `status = 'registered'`
   - `occurrence_index is not null`
   - `occurrence_date/time is null`
   Obecnie takich rekordów jest 74.
2. Ostatnia poprawka nie czyści tych danych wstecznych — dodała głównie deduplikację i indeks unikalny, ale nie wyłączyła starych błędnych zapisów z logiki widoku.

Dodatkowo znalazłem nadal niespójne miejsca w kodzie:
- `src/hooks/usePublicEvents.ts` nadal ma fallback do `idx:${occurrence_index}`
- `src/components/events/EventCardCompact.tsx` nadal wyszukuje / anuluje po `occurrence_index`
- `src/hooks/useEvents.ts` nadal buduje `registeredEventIds` ze wszystkich aktywnych rejestracji, więc część starych wpisów może dalej oznaczać wydarzenie jako zapisane na poziomie całego eventu

Co trzeba wdrożyć teraz
1. Naprawa wsteczna danych
- Wykonać cleanup danych istniejących już w bazie:
  - wszystkie aktywne rejestracje z `occurrence_index != null` i bez `occurrence_date/time` wyłączyć z aktywnej logiki
  - jeśli nie da się ich jednoznacznie przypisać do konkretnego terminu, oznaczyć je jako `cancelled`
- To jest kluczowe, bo bez tego stare błędne wpisy dalej będą wpływać na widżet.

2. Zaostrzenie odczytu rejestracji
- W `useEvents.ts` traktować jako aktywne tylko:
  - single event: rekord bez occurrence snapshotu i bez `occurrence_index`
  - recurring event: rekord wyłącznie z kompletem `occurrence_date + occurrence_time`
- Usunąć sytuację, w której sam `event_id` wystarcza do uznania, że użytkownik jest zapisany.

3. Usunięcie fallbacków indeksowych
- Usunąć fallback `idx:${occurrence_index}` z `usePublicEvents.ts`
- W `EventCardCompact.tsx` rejestracja, wznowienie i anulowanie mają działać po:
  - `event_id`
  - `user_id`
  - `occurrence_date`
  - `occurrence_time`
- `occurrence_index` może pozostać tylko pomocniczo, ale nie może decydować o dopasowaniu.

4. Ujednolicenie widoku „Moje spotkania”
- `MyMeetingsWidget` zostawić jako widok oparty wyłącznie na już oczyszczonych danych z `useEvents`
- Dzięki temu widżet pokaże tylko te terminy, na które użytkownik naprawdę kliknął „Zapisz się”.

5. Weryfikacja na realnych przypadkach
- Sprawdzić szczególnie wydarzenia, gdzie w bazie widać najwięcej legacy wpisów:
  - `O!Mega Chill`
  - `Pure Calling`
  - `Network Marketing Mastery`
  - `Start nowego partnera`
- Po cleanupie te terminy mają zniknąć z „Moje spotkania” dla osób, które nie zapisały się na aktualne wystąpienia.

Efekt po wdrożeniu
- Poprawka będzie działała także wstecznie, bo usunie wpływ starych błędnych rekordów.
- Jeśli użytkownik nie zapisał się na konkretny termin, ten termin nie pojawi się w widżecie.
- Edycja wydarzenia przez admina nie przeniesie dawnych zapisów na nowe daty.

Techniczne szczegóły
- Potwierdzone w bazie: 74 aktywne legacy rejestracje bez `occurrence_date/time`
- Potwierdzone w kodzie:
  - `usePublicEvents.ts` ma jeszcze fallback indeksowy
  - `EventCardCompact.tsx` nadal operuje po `occurrence_index`
  - ostatnia migracja `20260329112144_444cdc8a-16cf-45de-96c5-0c0d9f96f6bc.sql` tylko:
    - deduplikuje
    - tworzy stabilny indeks unikalny
    - ale nie robi cleanupu historycznych błędnych wpisów

Zakres następnej implementacji
- `src/hooks/useEvents.ts`
- `src/hooks/usePublicEvents.ts`
- `src/components/events/EventCardCompact.tsx`
- opcjonalnie przegląd `EventCard.tsx` pod tę samą zasadę
- operacja danych w Supabase czyszcząca stare aktywne rejestracje legacy
