## Diagnoza problemu

Licznik **„Dostępnych miejsc: 100"** na stronie publicznej wydarzenia liczy się jako:

```
availableSpots = max_tickets - tickets_sold
```

Pole `paid_events.tickets_sold` **nigdy nie jest aktualizowane** po nowej rejestracji. Sprawdziłem:
- W `event_form_submissions` mamy aktywne zgłoszenia (np. **6** dla Krakowa, **1** dla Łodzi).
- W `paid_events.tickets_sold` dla obu wydarzeń wartość = **0**.
- Na tabeli `event_form_submissions` **nie ma żadnego triggera**, który by inkrementował/dekrementował `tickets_sold`.

Stąd licznik nie spada. Płatne bilety (PayU) prawdopodobnie aktualizują `tickets_sold` w innym miejscu, ale rejestracje przez formularz (event_form_submissions) — nie.

## Cel

1. Naprawić odliczanie miejsc tak, by uwzględniało **aktywne rejestracje formularzowe** (status `active`) — bez wymagania ręcznej synchronizacji.
2. Dodać w panelu admina przełącznik **„Pokazuj 'Ostatnie wolne miejsca' zamiast liczby"** — gdy włączony, w miejscu „Dostępnych miejsc: N" pojawia się czerwony napis **„Ostatnie wolne miejsca!"**.

## Zakres zmian

### 1. Baza danych — migracja
Dodanie nowego pola w `public.paid_events`:

```sql
ALTER TABLE public.paid_events
  ADD COLUMN IF NOT EXISTS show_last_spots_label boolean NOT NULL DEFAULT false;
```

(Bez zmian struktury `tickets_sold` — pozostaje jako licznik PayU. Zliczanie aktywnych zgłoszeń formularzowych dodam w warstwie aplikacji, by nie tworzyć podwójnej logiki triggerów.)

### 2. Hook publiczny — pobranie liczby aktywnych zgłoszeń
W `src/pages/PaidEventPage.tsx` dodać dodatkowe zapytanie (równoległe z `paid-event`):

```ts
const { data: submissionsCount } = useQuery({
  queryKey: ['paid-event-submissions-count', event?.id],
  queryFn: async () => {
    const { count } = await supabase
      .from('event_form_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event!.id)
      .eq('status', 'active');
    return count ?? 0;
  },
  enabled: !!event?.id,
});
```

Następnie do `<PaidEventSidebar>` przekazać:
```tsx
ticketsSold={(event.tickets_sold ?? 0) + (submissionsCount ?? 0)}
showLastSpotsLabel={event.show_last_spots_label}
```

### 3. UI — `PaidEventSidebar.tsx`
- Dodać prop `showLastSpotsLabel?: boolean`.
- W sekcji „Availability" zastąpić tekst:
  - jeśli `showLastSpotsLabel === true` **i** `availableSpots > 0` → pokaż czerwony, pogrubiony napis **„Ostatnie wolne miejsca!"** (klasa `text-destructive font-semibold`).
  - jeśli `availableSpots === 0` → nadal „Brak miejsc".
  - w pozostałych przypadkach — bez zmian (`Dostępnych miejsc: N`, czerwony gdy <10).
- Również ukryć dodatkowy dolny komunikat „Zostało tylko N miejsc!" gdy tryb „ostatnie miejsca" jest aktywny (jeden komunikat zamiast dwóch).

### 4. Panel admina — formularz edycji wydarzenia
Sprawdzę plik `src/components/admin/paid-events/PaidEventForm.tsx` (lub odpowiednik). Dodać w sekcji ustawień rejestracji **Switch**:
- Etykieta: **„Pokazuj 'Ostatnie wolne miejsca' zamiast licznika"**
- Helper: „Zamiast liczby dostępnych miejsc wyświetli się czerwony napis zachęcający do szybkiej rejestracji."
- Zapis pola `show_last_spots_label` do `paid_events`.

## Pliki
- `supabase/migrations/<timestamp>_add_show_last_spots_label_to_paid_events.sql` (nowy)
- `src/components/paid-events/public/PaidEventSidebar.tsx` (edycja)
- `src/pages/PaidEventPage.tsx` (edycja — query + interface + props)
- `src/components/admin/paid-events/PaidEventForm.tsx` (edycja — Switch + zapis)

## Uwagi
- Liczenie zgłoszeń w warstwie aplikacji (zamiast triggera) jest świadomą decyzją: jest natychmiast spójne z danymi, nie wymaga utrzymywania triggerów oraz nie koliduje z istniejącą logiką PayU. Koszt: 1 dodatkowy lekki COUNT przy wejściu na stronę wydarzenia.
- `tickets_sold` z PayU pozostaje doliczane do sumy — uwzględniamy oba kanały sprzedaży.
- Jeśli w przyszłości pojawi się potrzeba real-time aktualizacji licznika, można dodać subskrypcję realtime na `event_form_submissions` (poza zakresem tej iteracji).
