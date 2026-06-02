## Problem

Bilet `Y6JLN8NV8KBX` to **kod zamówienia** (`paid_event_orders.ticket_code`), ale powiązany uczestnik w `paid_event_order_attendees` ma **inny** kod (`ZQPYP3E9PWSU`) — dane historyczne sprzed migracji do per-attendee.

Przebieg błędu:
1. Skan `Y6JLN8NV8KBX` → edge function `verify-event-ticket` nie znajduje uczestnika po tym kodzie → wpada w fallback "order-level" → ustawia `paid_event_orders.checked_in = true`.
2. Frontend (`TicketVerificationPanel.displayRows`) gdy zamówienie ma uczestników, **ignoruje** `order.checked_in` i pokazuje wyłącznie status z `attendee.checked_in` (który nadal jest `false`).
3. Efekt: górny baner mówi "Check-in wykonano", a lista uczestników pokazuje "0 po check-in" i przycisk "Check-in" przy tej osobie. To samo zachowanie na desktopie i mobile (nie jest to bug responsywny).

## Rozwiązanie

Ujednolicić zapis check-in tak, żeby zawsze trafiał na właściwego uczestnika, nawet gdy skanowany jest legacy `order.ticket_code`.

### Zmiana 1 — `supabase/functions/verify-event-ticket/index.ts`

W gałęzi fallback "order-level" (gdy kod pasuje do `paid_event_orders.ticket_code`, a nie do żadnego uczestnika), jeśli zamówienie posiada rekordy w `paid_event_order_attendees`:

- Pobrać uczestników danego zamówienia.
- Wybrać "głównego" uczestnika do aktualizacji w kolejności:
  1. uczestnik z `email = order.email`,
  2. uczestnik z najniższym `seat_index`,
  3. pierwszy w kolejności.
- Operacje check-in / check-out wykonywać na **tym** uczestniku (zamiast na `paid_event_orders`).
- Stan zwracany w odpowiedzi (`checkedIn`, `checkedInAt`, `attendee`) brać z uaktualnionego uczestnika.

Dzięki temu lista uczestników zawsze odzwierciedla aktualny status — niezależnie czy skanowany był nowy kod uczestnika, czy stary kod zamówienia.

### Zmiana 2 — `src/components/ticket-verification/TicketVerificationPanel.tsx` (optymistyczne odświeżenie)

Po check-in/out, gdy zeskanowany kod pasuje do `order.ticket_code` ale nie do żadnego `attendee.ticket_code`, w aktualizacji optymistycznej (`setOrders(...)`) zaktualizować również tego samego "głównego" uczestnika (email = order.email → najniższy seat_index → pierwszy). Logika `loadOrders(...)` zaraz po tym i tak pobierze prawdziwy stan z serwera, ale UI od razu pokaże poprawny check-in zanim odpowiedź wróci.

Żadnych zmian w bazie ani RLS — to wyłącznie poprawka logiki w edge function + spójna aktualizacja optymistyczna w UI.

## Weryfikacja

- Cofnąć check-in dla testowego biletu i zeskanować ponownie — lista uczestników powinna natychmiast pokazać "1 po check-in" i zielony badge przy nazwisku.
- Sprawdzić zarówno desktop, jak i mobile (logika identyczna).
- Sprawdzić zamówienie z wieloma uczestnikami, gdzie skanowany jest indywidualny `attendee.ticket_code` — działanie bez zmian.
