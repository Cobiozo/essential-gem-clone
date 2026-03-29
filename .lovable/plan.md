
Problem nie jest już tylko w filtrze widżetu. W danych nadal istnieją aktywne rejestracje dla wydarzeń cyklicznych, które mają `occurrence_index`, ale nie mają stabilnego snapshotu `occurrence_date` i `occurrence_time`. Po edycji zakończonego wydarzenia indeks zaczyna wskazywać nowy termin, więc „Moje spotkania” pokazuje daty, na które użytkownik realnie się nie zapisał.

Co ustaliłem
- `MyMeetingsWidget` pokazuje wszystko z `expandEventsForCalendar(...)`, gdzie wystarczy `e.is_registered === true`.
- `expandEventsForCalendar` już dopasowuje po `event_id + date + time`, więc samo renderowanie jest teraz poprawniejsze.
- Główny błąd jest w danych i w pozostałych ścieżkach:
  1. w bazie są nadal aktywne rekordy `event_registrations` z `occurrence_index != null`, ale `occurrence_date/time = null`
  2. `useEvents.getUserEvents()` nadal rozwija multi-occurrence po samym `occurrence_index`, więc dla starych zapisów potrafi przypisać nowy termin
  3. stary unikalny constraint nadal opiera się na `occurrence_index`, więc model nadal traktuje indeks jako główny identyfikator

Plan naprawy
1. Zablokować pokazywanie „niepewnych” rejestracji
- W `useEvents.getUserEvents()` przestać mapować multi-occurrence po samym `occurrence_index`.
- Dla wydarzeń cyklicznych uznawać rejestrację za aktywną tylko wtedy, gdy ma komplet:
  - `occurrence_date`
  - `occurrence_time`
  i da się ją dokładnie dopasować do aktualnego terminu.
- Jeśli aktywny rekord ma tylko stary indeks bez daty/godziny, nie pokazywać go w „Moje spotkania”.

2. Ujednolicić wszystkie ścieżki odczytu rejestracji
- Sprawdzić wszystkie miejsca korzystające z rejestracji użytkownika i usunąć fallbacki indeksowe dla eventów cyklicznych.
- Szczególnie doprowadzić do tej samej zasady w:
  - `src/hooks/useEvents.ts`
  - `src/hooks/usePublicEvents.ts`
  - `src/hooks/useOccurrences.ts`
  - `src/components/dashboard/widgets/MyMeetingsWidget.tsx`

3. Naprawić model danych w bazie
- Dodać migrację czyszczącą / naprawczą dla aktywnych rejestracji cyklicznych:
  - jeśli da się bezpiecznie odtworzyć historyczny `occurrence_date/time`, uzupełnić
  - jeśli nie da się tego potwierdzić po obecnym `occurrences`, oznaczyć taki rekord jako nieaktywny dla przyszłych terminów albo wykluczyć go z logiki aktywnej rejestracji
- Celem jest: brak aktywnej rejestracji na cykliczny termin bez stabilnego snapshotu daty i godziny.

4. Odejść od constraintu opartego wyłącznie na indeksie
- Zmienić unikalność rejestracji dla wydarzeń cyklicznych tak, aby była oparta na stabilnym terminie, a nie na pozycji w tablicy.
- Dzięki temu przyszłe zapisy i wznowienia nie będą dalej utrwalały błędnego modelu.

5. Dopiąć logikę zapisu/anulowania
- W `EventCard` i `EventCardCompact` zostawić zapis tylko z pełnym snapshotem terminu.
- Przy anulowaniu/wznawianiu dla wydarzeń cyklicznych operować na konkretnym terminie, nie na samym `occurrence_index`.

Efekt po wdrożeniu
- Jeśli użytkownik nie kliknął „Zapisz się” na konkretny termin, ten termin nie pojawi się w „Moje spotkania”.
- Edycja zakończonego wydarzenia i dodanie nowych dat nie przeniesie starych zapisów na nowe terminy.
- Problem przestanie dotyczyć wszystkich użytkowników, bo usunięte zostanie źródło błędu w aktywnych rejestracjach i w fallbackach indeksowych.

Zakres zmian
- `src/hooks/useEvents.ts`
- `src/hooks/usePublicEvents.ts`
- `src/hooks/useOccurrences.ts`
- `src/components/dashboard/widgets/MyMeetingsWidget.tsx`
- `src/components/events/EventCard.tsx`
- `src/components/events/EventCardCompact.tsx`
- migracja Supabase naprawiająca stare aktywne rejestracje i constraint oparty na `occurrence_index`

Techniczne potwierdzenie problemu
- W bazie są aktywne rekordy `event_registrations` z `occurrence_index` ustawionym, ale bez `occurrence_date/time`.
- Przykładowo dla wydarzeń takich jak „Pure Calling” i „O!Mega Chill” istnieje dużo takich aktywnych wpisów.
- To dokładnie tłumaczy, dlaczego po edycji cyklicznych wydarzeń nowe terminy nadal wpadają do „Moje spotkania”, mimo że użytkownik nie kliknął zapisu na te nowe daty.
