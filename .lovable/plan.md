## Diagnoza

W bazie zamówienie `15d3f6cc-c4e4-4e62-ab38-e50a06a589f1` partnera `sebastiansnopek.eqology@gmail.com` nadal ma `status = 'awaiting_transfer'`, mimo że admin kliknął „Opłacono" (zgłoszenie ma `payment_status='paid'`, `payment_marked_at=12:12:31`). Karta partnera w UI czyta status z `paid_event_orders.status`, dlatego dalej widzi „Oczekuje przelewu".

**Przyczyna:** w `admin-mark-event-payment/index.ts` próbujemy zrobić:
```ts
.update({ status: "paid", paid_at: new Date().toISOString() })
```
ale w tabeli `paid_event_orders` **nie ma kolumny `paid_at`**. Supabase JS nie rzuca wyjątku – zwraca `{ error }`, którego kod nie sprawdza, więc update po cichu nie wykonuje się. Bilet PDF i tak idzie (bo `issueFreeTicketForOrder` to osobne wywołanie, aktualizuje tylko `ticket_sent_at`), ale status zamówienia nigdy nie zmienia się na `paid`. Logi edge-funkcji potwierdzają wysyłkę biletu, ale brak udanego UPDATE statusu.

## Plan naprawy

### 1. `supabase/functions/admin-mark-event-payment/index.ts`
- Usunąć `paid_at` z update'u (kolumna nie istnieje). Zostawić `{ status: "paid" }` – `updated_at` zaktualizuje się triggerem.
- Sprawdzać `error` z `.update(...).select()` i logować/zwracać błąd per zamówienie, żeby kolejna regresja nie była cicha.

### 2. `supabase/functions/_shared/free-event-ticket.ts` (defensywnie)
- W `issueFreeTicketForOrder` dorzucić podniesienie `status='paid'` wraz z `ticket_sent_at` (tylko jeśli aktualny status nie jest `cancelled`/`refunded`). To gwarantuje spójność: jeśli bilet zostaje wysłany, zamówienie zawsze jest oznaczone jako opłacone.

### 3. Data fix (migracja)
- `UPDATE public.paid_event_orders SET status='paid' WHERE id='15d3f6cc-c4e4-4e62-ab38-e50a06a589f1';`
  – pozwoli partnerowi natychmiast zobaczyć właściwy status na karcie wydarzenia bez czekania na ponowne kliknięcie admina.

### 4. Weryfikacja
- Po migracji odświeżyć stronę – baner powinien zmienić się z pomarańczowego „Oczekuje przelewu" na zielony „Opłacone".
- Sprawdzić ponowne kliknięcie „Opłacono" na innym zgłoszeniu testowym – status w `paid_event_orders` musi po nim wynosić `paid`.

## Czego NIE zmieniamy
- Logika `confirm-event-form-email` (rozróżnianie rezerwacji przelewowych) zostaje – działa poprawnie.
- Nie dodajemy kolumny `paid_at` – nie jest potrzebna; `updated_at` wystarcza, a dodanie kolumny byłoby zmianą schema bez wartości biznesowej.
