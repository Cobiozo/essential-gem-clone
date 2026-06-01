## Problem

Check-in jest zapisywany w tabeli `paid_event_order_attendees` (per miejsce/bilet — wynik z `verify-event-ticket` gdy znajdzie attendee), ale lista uczestników w `TicketVerification.tsx` używa kolumn `checked_in`/`checked_in_at` z `paid_event_orders`. Te kolumny nie są aktualizowane, więc:

- wiersz na liście nie podświetla się na zielono,
- nie pojawia się przycisk „Check-out",
- licznik „po check-in" pokazuje 0.

## Fix

### 1. `supabase/functions/admin-list-event-orders/index.ts`

Dodać embed attendees do zapytania:

```ts
.select(`id, event_id, user_id, email, first_name, last_name, phone, status,
  email_confirmed_at, ticket_code, ticket_sent_at, checked_in, checked_in_at,
  created_at, ticket_id,
  paid_event_tickets(name),
  paid_event_order_attendees(id, seat_index, first_name, last_name, email,
    ticket_code, checked_in, checked_in_at)`)
```

Pole `paid_event_order_attendees` zostanie dołączone do każdego order.

### 2. `src/components/admin/paid-events/TicketVerification.tsx`

a) Rozszerzyć `OrderRow` o `attendees?: Attendee[]`.

b) Po pobraniu orders zbudować płaską listę „seatów" (`displayRows`):
   - jeśli `order.attendees?.length > 0` → po jednym wierszu na attendee (z `ticket_code`, `first_name`, `last_name`, `email`, `checked_in`, `checked_in_at` z attendee, fallback na order),
   - w przeciwnym razie → jeden wiersz z danymi order (legacy single-ticket).

c) `filteredOrders`, `counts` i renderowana lista operują na `displayRows` (klucz = attendee.id lub order.id). `counts.checkedIn` liczy seaty z `checked_in === true`.

d) Po check-in/check-out optymistycznie aktualizować `orders` po `ticket_code` w obrębie `attendees` (jeśli attendee ma ten kod) lub na poziomie order (fallback), tak jak teraz. Następnie i tak wywołujemy `loadOrders(...)` więc świeże dane przyjdą z serwera.

Brak zmian w `verify-event-ticket` ani w schemacie bazy.

## Wynik

Po zeskanowaniu/kliknięciu „Check-in" wiersz danego uczestnika podświetla się na zielono, pokazuje godzinę i przycisk „Check-out", a badge „X po check-in" rośnie zgodnie z rzeczywistością.