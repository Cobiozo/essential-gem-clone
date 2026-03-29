
Cel: naprawić źródło problemu, a nie tylko sam widżet. Teraz system wiąże zapis z `event_id + occurrence_index`, więc po edycji wydarzenia cyklicznego stare zapisy mogą wskazywać na nowe terminy, jeśli admin zmieni listę `occurrences`.

Plan wdrożenia

1. Ustalić trwały identyfikator konkretnego terminu
- Dodać do logiki wydarzeń pojęcie niezmiennego klucza terminu, np. `occurrence_key` albo snapshot `occurrence_date + occurrence_time`.
- Przy zapisie na termin zapamiętywać ten konkretny termin w rejestracji, zamiast polegać wyłącznie na indeksie w tablicy.

2. Naprawić dopasowanie rejestracji do terminu
- W `useOccurrences.ts`, `useEvents.ts`, `usePublicEvents.ts` i widżecie `MyMeetingsWidget` dopasowywać zapis tylko wtedy, gdy termin z rejestracji dokładnie odpowiada aktualnemu terminowi.
- Jeśli rejestracja ma tylko stary `occurrence_index`, ale nie da się jej bezpiecznie potwierdzić po dacie/godzinie, nie pokazywać jej jako aktywnego zapisu na nowy termin.

3. Zabezpieczyć „Moje spotkania”
- Widżet ma pokazywać wyłącznie:
  - spotkania indywidualne, gdzie użytkownik jest hostem, albo
  - wydarzenia/terminy, dla których istnieje potwierdzony zapis na konkretny termin.
- Usunąć wszelkie fallbacki typu „mam jakiś zapis na event, więc pokaż termin”.

4. Zabezpieczyć edycję zakończonych wydarzeń cyklicznych
- W formularzach admina dla wydarzeń z `occurrences` dodać zasadę:
  - jeśli wydarzenie jest zakończone i admin dodaje nowe terminy, system traktuje je jak nowe wystąpienia, bez dziedziczenia starych zapisów.
- Technicznie: stare rejestracje nie mogą zostać automatycznie skojarzone z nowo zapisanymi terminami po edycji listy `occurrences`.

5. Dodać migrację zgodności wstecznej
- Uzupełnić istniejące `event_registrations` o dane potrzebne do stabilnego mapowania konkretnego terminu tam, gdzie jest to możliwe.
- Dla starych wpisów, których nie da się pewnie przypisać do aktualnego terminu, zachować historię, ale nie pokazywać ich w „Moje spotkania” jako aktywnego zapisu na nowy termin.

6. Zweryfikować miejsca zależne od rejestracji
- Sprawdzić i dostosować:
  - `MyMeetingsWidget.tsx`
  - `UpcomingMeetings.tsx`
  - `useEvents.ts`
  - `usePublicEvents.ts`
  - `useOccurrences.ts`
  - komponenty zapisu/anulowania (`EventCard`, `EventCardCompact`)
- Cel: wszędzie obowiązuje ta sama zasada „zapis jest zawsze na konkretny termin”.

Techniczne uwagi
- Obecna poprawka usunęła część problemu (`legacy null`), ale nie rozwiązała głównej wady modelu danych: `occurrence_index` nie jest stabilnym identyfikatorem po edycji `occurrences`.
- Dlatego sama zmiana w filtrze widżetu nie wystarczy.
- Najbezpieczniejsza poprawka to odejście od samego `occurrence_index` na rzecz trwałego identyfikatora lub snapshotu terminu.

Efekt po wdrożeniu
- Nowe terminy nie pojawią się w „Moje spotkania”, dopóki użytkownik nie kliknie „zapisz się” na ten konkretny termin.
- Edycja zakończonego wydarzenia i dodanie nowych dat nie przeniesie starych zapisów na nowe terminy.
- Widżet będzie pokazywał tylko realnie zapisane terminy.

Zakres plików do zmian
- `src/hooks/useOccurrences.ts`
- `src/hooks/useEvents.ts`
- `src/hooks/usePublicEvents.ts`
- `src/components/dashboard/widgets/MyMeetingsWidget.tsx`
- `src/components/events/UpcomingMeetings.tsx`
- `src/components/events/EventCard.tsx`
- `src/components/events/EventCardCompact.tsx`
- formularze/admin dla edycji wydarzeń cyklicznych
- migracja Supabase dla stabilnego identyfikatora terminu w `event_registrations`
