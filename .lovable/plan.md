# Dane do przelewu per bilet + weryfikacja powiadomień

## Problem

Obecnie dane do przelewu są wspólne dla całego wydarzenia (`paid_events.transfer_payment_details`). Gdy wydarzenie jest oznaczone jako **bezpłatne**, sekcja „Metody płatności" jest wyłączona, więc nie da się ustawić danych do przelewu — a Ty potrzebujesz pojedynczego biletu „TRANSFER" dla zalogowanych w bezpłatnym wydarzeniu (np. „Kompleksowe szkolenie test").

## Rozwiązanie

### 1. Dane do przelewu na poziomie biletu
- Migracja: dodaj kolumnę `transfer_payment_details text` do `paid_event_tickets` (NULLABLE).
- W `EventTicketsPanel.tsx`: gdy `payment_method === 'transfer'` (per bilet), pokaż pod listą metody płatności biletu **Textarea „Dane do przelewu *"** (analogiczna do tej w `EventPaymentMethodsPanel`) z placeholderem i podpowiedzią: „Treść zostanie umieszczona w emailu po rezerwacji tego biletu". Zapis wraz z resztą pól biletu.
- Walidacja zapisu: jeśli bilet wymusza `transfer`, musi mieć wpisane dane do przelewu **albo** wydarzenie musi mieć ustawione globalne `transfer_payment_details`.

### 2. Edge function `register-event-transfer-order`
- Pobranie ticketu rozszerzyć o `transfer_payment_details` z `paid_event_tickets`.
- Logika priorytetu: `transferDetails = ticket.transfer_payment_details?.trim() || event.transfer_payment_details?.trim()`.
- Złagodzenie sprawdzenia `event.payment_method_transfer`: jeśli `ticket.payment_method === 'transfer'`, bilet sam wymusza metodę — pomiń wymóg włączenia metody na poziomie wydarzenia (to odblokowuje scenariusz „bezpłatne wydarzenie + 1 bilet TRANSFER dla zalogowanych").
- Jeśli ani bilet ani wydarzenie nie mają danych → zwróć `transfer_details_missing`.

### 3. Wyświetlanie po rezerwacji (frontend)
W tych miejscach dane do przelewu są pokazywane z `paid_events.transfer_payment_details`. Zmienić, aby zaciągały najpierw z ticketu (jeśli zamówienie ma `ticket_id`):
- `src/pages/TicketPage.tsx`
- `src/pages/CheckoutPage.tsx`
- `src/components/paid-events/MyTicketOrders.tsx`

Query rozszerzyć o `paid_event_tickets ( transfer_payment_details )` i przy renderze użyć `ticket.transfer_payment_details || event.transfer_payment_details`.

### 4. Weryfikacja powiadomień (bez zmian w logice — tylko potwierdzenie)

Po wdrożeniu konfiguracja „Kompleksowe szkolenie test" (event `is_free=true`, bilet TRANSFER widoczny tylko dla zalogowanych z własnymi danymi do przelewu, drugi bilet darmowy dla gości) zachowuje się tak:

**Zalogowany partner → bilet TRANSFER:**
1. `PurchaseDrawer` woła `register-event-transfer-order`.
2. Tworzony jest order ze statusem `pending_transfer`.
3. Edge function wysyła email z nagłówkiem wydarzenia, danymi gościa i **danymi do przelewu z biletu** (fallback do event-level).
4. Bilet QR generuje się dopiero po ręcznym oznaczeniu zapłaty przez admina (`admin-mark-event-payment`) — to obecne zachowanie i nie zmieniamy go.

**Gość → bilet darmowy:**
1. `PurchaseDrawer` (lub flow free) woła `register-free-event-order`.
2. Gość dostaje **email z linkiem potwierdzającym adres** (`confirm-free-event-reservation`).
3. Po kliknięciu w link generowany jest bilet QR i wysyłany na ten sam adres.

Oba przepływy istnieją i są używane warunkowo na podstawie `payment_method` biletu — żadnych zmian nie potrzeba poza punktami 1–3 powyżej.

## Pliki do zmiany

- migracja SQL: `ALTER TABLE paid_event_tickets ADD COLUMN transfer_payment_details text`
- `src/components/admin/paid-events/editor/EventTicketsPanel.tsx`
- `src/integrations/supabase/types.ts` (auto po migracji)
- `supabase/functions/register-event-transfer-order/index.ts`
- `src/pages/TicketPage.tsx`
- `src/pages/CheckoutPage.tsx`
- `src/components/paid-events/MyTicketOrders.tsx`
