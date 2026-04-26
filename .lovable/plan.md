## Cel

Dokończyć punkt 5: po włączeniu przez admina `show_in_dashboard_calendar` event musi pojawić się w `CalendarWidget` (pulpit główny) jako:
- czerwona kropka w siatce kalendarza w dniu wydarzenia,
- nowa pozycja w legendzie z czerwoną kropką: **EVENT**,
- po kliknięciu w datę: kafelek z tytułem, godziną oraz przyciskami **Szczegóły** i **Zapisz się**, oba kierujące na publiczną stronę wydarzenia (`/e/:slug`).

Zachowujemy pełną dotychczasową funkcjonalność widżetu (webinary, spotkania zespołu, trójstronne, konsultacje, multi-occurrence, indywidualne anulowania, filtrowanie legendą, przyciski Wejdź/Wypisz się). Paid eventy są tylko dodatkowym, izolowanym typem `paid_event`.

## Bezpieczeństwo

- Brak zmian w bazie danych i w RLS — kolumna `show_in_dashboard_calendar` już istnieje, polityki `paid_events` (publiczny odczyt opublikowanych) pozostają bez zmian.
- Brak nowych edge functions, brak nowych zapytań po kliknięciu — dane już płyną przez `useEvents.ts`.
- Otwarcie strony eventu w **nowej karcie** (`window.open(..., '_blank', 'noopener,noreferrer')`) — nie zaburza stanu pulpitu i nie wymaga zmian w routingu.

## Zmiany w `src/components/dashboard/widgets/CalendarWidget.tsx`

1. **Filtr `expandedEvents`** — pozostaje wykluczenie `auto_webinar`, ale `paid_event` przechodzi normalnie (pojedyncze wystąpienie, więc `expandEventsForCalendar` nic z nim nie robi).

2. **`getEventColor`** — dodać przypadek:
   ```ts
   case 'paid_event':
     return 'bg-red-500';
   ```

3. **`legendItems`** — dodać nową pozycję na końcu:
   ```ts
   { type: 'paid_event', color: 'bg-red-500', label: tf('events.type.paidEvent', 'EVENT') }
   ```
   Filtr w `filteredEvents` już obsługuje równość `event.event_type === activeFilter`, więc filtr "EVENT" zadziała bez dodatkowej logiki.

4. **Kafelek dnia (sekcja `selectedDayEvents.map`)** — dla `event.event_type === 'paid_event'` renderujemy uproszczony wariant:
   - ikona `Calendar` w kolorze `text-red-500` zamiast Video/Users,
   - tytuł + godzina (już są w istniejącym układzie),
   - prawy zestaw przycisków zamiast `getRegistrationButton`:
     - **Szczegóły** → `window.open('/e/' + (event as any)._event_slug, '_blank', 'noopener,noreferrer')`
     - **Zapisz się** (variant `default`) → ten sam URL,
   - brak custom `event.buttons` (paid eventy ich tu nie używają),
   - brak bloku host/participant (nie dotyczy).
   
   Realizacja: na początku iteracji `if (event.event_type === 'paid_event') return <PaidEventDayItem ... />;` (inline JSX, bez nowego pliku) — dzięki temu istniejąca logika dla pozostałych typów pozostaje **nietknięta**.

5. **`getRegistrationButton`** — bez zmian (paid eventy do niej nie trafiają).

6. **`EventDetailsDialog`** — bez zmian; paid eventy nie otwierają tego dialogu (mają własną stronę `/e/:slug`).

## Co NIE jest zmieniane

- `useEvents.ts` — fetch `paid_events` już działa po poprzedniej iteracji.
- Migracja DB — już wykonana.
- `EventMainSettingsPanel.tsx` — toggle widoczności już dodany.
- Pozostałe widżety pulpitu, hook rejestracji, edge functions — bez zmian.

## Weryfikacja po wdrożeniu

1. Admin włącza w edytorze paid event'a "Pokaż w kalendarzu pulpitu" → kropka czerwona pojawia się w dniu wydarzenia.
2. Klik w legendę "EVENT" filtruje tylko paid eventy.
3. Klik w datę → kafelek z tytułem, godziną, przyciskami Szczegóły / Zapisz się prowadzącymi do `/e/:slug` w nowej karcie.
4. Webinary, team_training, spotkania trójstronne, konsultacje, multi-occurrence — działają identycznie jak przed zmianą (regresja zerowa, bo dodajemy gałąź wcześniejszego `return`).