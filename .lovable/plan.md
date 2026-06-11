## Problem

Na publicznej stronie wydarzenia (`/p/:slug`, plik `src/pages/PaidEventPage.tsx`) licznik „Dostępnych miejsc" liczony jest jako:

```
max_tickets − (event.tickets_sold + liczba aktywnych event_form_submissions)
```

Pomija to wszystkie pozostałe ścieżki rejestracji, więc miejsca się nie zmniejszają, gdy zapisują się partnerzy, klienci, goście PLC czy uczestnicy płatnych biletów. Dla BOM Łódź (max 155) w bazie jest już 13 aktywnych zgłoszeń z formularza + 33 uczestników w zamówieniach (13 opłaconych + 16 oczekujących), a strona dalej pokazuje 155.

## Rozwiązanie

Ujednolicić sposób liczenia zajętych miejsc na publicznej stronie wydarzenia tak, aby uwzględniał wszystkie aktywne rezerwacje, niezależnie od kanału.

### Co zaliczamy do „zajętych miejsc" (sumujemy):

1. **`event_form_submissions`** — `status = 'active'` (już liczone)
2. **`paid_event_order_attendees`** — wszyscy uczestnicy zamówień, których `paid_event_orders.status ∈ ('paid', 'awaiting_transfer', 'pending')` i `cancelled_at IS NULL` (bilet zajmuje miejsce od momentu utworzenia zamówienia, nie dopiero po opłaceniu — inaczej można dwukrotnie sprzedać te same miejsca).
   - Jeśli zamówienie nie ma jeszcze rekordów w `paid_event_order_attendees` (np. zamówienie 1-biletowe bez listy gości), liczymy `quantity` z `paid_event_orders` jako fallback, żeby nie pominąć żadnego miejsca.
3. **`guest_event_registrations`** — `status = 'active'` (rejestracje gości PLC).

Kolumna `paid_events.tickets_sold` jest ignorowana w publicznym widoku (nie jest spójnie utrzymywana). Pozostaje w bazie bez zmian — żeby nie ruszać innych miejsc, które na niej polegają.

### Zmiany w kodzie

**Plik: `src/pages/PaidEventPage.tsx`**

Zastąpić istniejący `useQuery` `activeSubmissionsCount` jednym hookiem `useOccupiedSeats(eventId)`, który równolegle (Promise.all) wykonuje 4 zapytania `count: 'exact', head: true`:

```ts
const { count: submissionsCount } = await supabase
  .from('event_form_submissions')
  .select('id', { count: 'exact', head: true })
  .eq('event_id', eventId).eq('status', 'active');

const { count: attendeesCount } = await supabase
  .from('paid_event_order_attendees')
  .select('id, order:paid_event_orders!inner(status, cancelled_at)', { count: 'exact', head: true })
  .eq('order.event_id', eventId)
  .in('order.status', ['paid','awaiting_transfer','pending'])
  .is('order.cancelled_at', null)
  .is('cancelled_at', null);

// orders bez attendees — fallback po quantity
const { data: ordersNoAttendees } = await supabase
  .from('paid_event_orders')
  .select('id, quantity, paid_event_order_attendees(id)')
  .eq('event_id', eventId)
  .in('status', ['paid','awaiting_transfer','pending'])
  .is('cancelled_at', null);
const fallbackSeats = ordersNoAttendees
  .filter(o => (o.paid_event_order_attendees?.length ?? 0) === 0)
  .reduce((sum, o) => sum + (o.quantity ?? 1), 0);

const { count: guestCount } = await supabase
  .from('guest_event_registrations')
  .select('id', { count: 'exact', head: true })
  .eq('event_id', eventId).eq('status', 'active');

return submissionsCount + attendeesCount + fallbackSeats + guestCount;
```

Następnie:

```ts
ticketsSold={occupiedSeats}
```

`staleTime` ustawiamy na 15–30 s, żeby przy odświeżeniu lub powrocie na zakładkę licznik szybko się aktualizował.

### Co pozostaje bez zmian

- Logika RLS, edge functions, walidacja zapisów (`create-event-order`, `submit-event-form`) — bez zmian. Tam istnieje już osobne sprawdzenie dostępności przy zapisie.
- Admin panel — bez zmian (admin korzysta z własnych liczników).
- Etykiety „Ostatnie wolne miejsca!" / „Zostało tylko X" w `PaidEventSidebar` — automatycznie zaczną działać poprawnie, bo dostają teraz realny `availableSpots`.

## Pliki do zmiany

- `src/pages/PaidEventPage.tsx` — rozszerzenie liczenia zajętych miejsc o `paid_event_order_attendees`, fallback `paid_event_orders.quantity`, i `guest_event_registrations`.

Brak zmian w bazie i edge functions.
