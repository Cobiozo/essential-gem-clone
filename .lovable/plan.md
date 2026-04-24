## Plan zmian

1. Naprawię logikę dostępu do publicznej strony wydarzenia tak, aby niezalogowany użytkownik mógł wejść na stronę, jeśli admin włączył widoczność dla gości choćby części treści. Obecnie ustawienia `guests_show_*` działają dopiero po przejściu bramki dostępu, więc gość trafia na ekran „Brak dostępu”.

2. Uporządkuję warunki renderowania na stronie eventu:
   - gość zobaczy tylko te sekcje, które admin dopuścił,
   - zalogowany użytkownik nadal będzie widział treści zgodnie z ustawieniami ról,
   - blok „Twój link partnerski do formularza rejestracyjnego” zostanie całkowicie usunięty ze strony informacyjnej wydarzenia.

3. Rozszerzę opisy w `EventMainSettingsPanel`, aby każda opcja mówiła wprost, co zniknie po jej wyłączeniu, np.:
   - wyłączenie opisu ukrywa pełny opis wydarzenia,
   - wyłączenie prelegentów ukrywa sekcję „Prelegenci”,
   - wyłączenie biletów/CTA ukrywa sidebar z biletami, ceny i przycisk zapisu,
   - wyłączenie harmonogramu ukrywa sekcję harmonogramu/programu.

4. Sprawdzę spójność ustawienia harmonogramu z faktycznym frontendem, bo w kodzie istnieje przełącznik `guests_show_schedule`, ale sama sekcja harmonogramu na stronie jest obecnie niewłączona. Dopasuję opis i logikę tak, żeby admin nie widział opcji, która nic realnie nie zmienia.

## Wynik po wdrożeniu

- Niezalogowany użytkownik przestanie dostawać „Brak dostępu”, jeśli event ma być częściowo publiczny dla gości.
- Gość zobaczy tylko dozwolone elementy strony eventu.
- Ze strony wydarzenia zniknie sekcja z partnerskim linkiem do formularza.
- W panelu admina opisy przełączników będą jednoznaczne i operacyjne.

## Techniczne szczegóły

Pliki do zmiany:
- `src/pages/PaidEventPage.tsx`
- `src/components/admin/paid-events/editor/EventMainSettingsPanel.tsx`

Najważniejsza poprawka:
- `hasAccess` w `PaidEventPage.tsx` zostanie rozdzielone na:
  - dostęp do samej strony eventu dla gościa,
  - widoczność poszczególnych sekcji dla gościa.

Dodatkowo usunę import i renderowanie:
- `MyEventFormLinks` z `src/pages/PaidEventPage.tsx`.