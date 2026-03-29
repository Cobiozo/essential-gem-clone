
Znalazłem nowy trop: poprzednia diagnoza była tylko częściowo trafna.

Co potwierdziłem
1. Poprzedni cleanup zadziałał:
- aktywne legacy rejestracje bez `occurrence_date/occurrence_time` są już wyczyszczone
- w bazie jest teraz `0` takich rekordów

2. Problem nadal może występować, ale już z innego powodu:
- w bazie nadal istnieje dużo aktywnych rejestracji ze snapshotem daty/godziny dla wydarzeń cyklicznych
- to oznacza, że widżet pokazuje nie „duchy bez daty”, tylko realne aktywne wiersze `event_registrations`

3. Najbardziej podejrzane miejsce w kodzie nadal nie zostało domknięte:
- `src/hooks/useEvents.ts` w `registerForEvent(...)` nadal szuka istniejącej rejestracji po `occurrence_index`
- `src/components/events/EventCard.tsx` nadal robi re-aktywację po `occurrence_index`
- po zmianie kolejności terminów przez admina taki kod może „ożywiać” stary zapis dla nowego terminu pod tym samym indeksem

To dobrze tłumaczy sytuację:
- rekord ma już snapshot daty/godziny
- więc nie wpada do ostatniego cleanupu
- ale mógł zostać utworzony lub nadpisany wcześniej błędną logiką indeksową

Plan naprawy
1. Domknąć wszystkie ścieżki zapisu/anulowania
- w `src/hooks/useEvents.ts` usunąć wyszukiwanie istniejących rejestracji po `occurrence_index`
- dla wydarzeń cyklicznych operować wyłącznie po:
  - `event_id`
  - `user_id`
  - `occurrence_date`
  - `occurrence_time`
- `occurrence_index` zostawić najwyżej jako informację pomocniczą, ale nie jako klucz logiki

2. Naprawić drugi stary komponent
- w `src/components/events/EventCard.tsx` zrobić to samo
- dziś ten komponent nadal może tworzyć lub reaktywować błędne wpisy po indeksie
- to trzeba ujednolicić z już poprawionym `EventCardCompact.tsx`

3. Ustabilizować źródło danych widżetu „Moje spotkania”
- zamiast polegać wyłącznie na szerokim `events` + `expandEventsForCalendar(...)`, oprzeć widżet na wyniku `getUserEvents()`
- dzięki temu widżet będzie renderował tylko to, co wynika z aktywnych rejestracji użytkownika, a nie z globalnej listy wydarzeń i mapy pomocniczej w `window`

4. Dodać diagnostykę dla konkretnego użytkownika
- przed kolejnym cleanupem sprawdzić dokładnie, jakie aktywne snapshoty ma konto użytkownika, który zgłasza problem
- porównać:
  - co jest w `event_registrations`
  - co pokazuje widżet
  - które ścieżki w UI mogły te wpisy utworzyć
- to pozwoli odróżnić:
  - błąd renderowania
  - od faktycznie błędnych aktywnych zapisów w bazie

5. Wykonać tylko precyzyjny cleanup danych
- nie robić kolejnego szerokiego `UPDATE ... SET status='cancelled'` dla wszystkich snapshotów
- zamiast tego anulować wyłącznie rekordy potwierdzone jako błędne dla konkretnych użytkowników / konkretnych terminów
- obecnie pozostałe rekordy wyglądają jak „prawdziwe aktywne wpisy”, więc masowe czyszczenie byłoby ryzykowne

Efekt po wdrożeniu
- nowe błędne zapisy nie będą już powstawać przez logikę opartą o indeks
- widżet przestanie zależeć od pośredniej globalnej mapy jako głównego źródła prawdy
- da się bezpiecznie usunąć tylko te terminy, które faktycznie są błędne na koncie zgłaszającego użytkownika

Techniczne szczegóły
- potwierdzone: `0` aktywnych legacy rejestracji bez snapshotu
- nadal problematyczne pliki:
  - `src/hooks/useEvents.ts`
  - `src/components/events/EventCard.tsx`
  - `src/components/dashboard/widgets/MyMeetingsWidget.tsx`
- już poprawione wcześniej, ale niewystarczające:
  - `src/hooks/usePublicEvents.ts`
  - `src/components/events/EventCardCompact.tsx`

Zakres następnej implementacji
1. Refaktor `registerForEvent` i `cancelRegistration` w `useEvents.ts`
2. Refaktor starego `EventCard.tsx`
3. Przełączenie `MyMeetingsWidget` na twardsze źródło danych użytkownika
4. Audyt konkretnego konta i dopiero potem punktowy cleanup błędnych snapshotów
