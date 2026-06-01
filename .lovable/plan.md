**Diagnoza**

Jan Kowal zarejestrował się przez formularz rejestracyjny wydarzenia („Kompleksowe szkolenie TEST", `is_free=true`) — jego dane są w `event_form_submissions` (`email_confirmed_at` ustawione, `payment_status=paid`), ale NIE ma odpowiadającego wpisu w `paid_event_orders`. Ścieżka potwierdzenia maila dla zgłoszeń przez formularz (`confirm-event-form-email`) tylko:
- oznacza zgłoszenie jako potwierdzone,
- powiadamia administratorów i partnera zapraszającego,
- aktualizuje CRM.

Nie generuje biletu ani nie wysyła maila z biletem (QR/PDF). Ta logika istnieje wyłącznie w `confirm-free-event-reservation`, która obsługuje rezerwacje przez `paid_event_orders`. Dlatego gość zarejestrowany formularzem na darmowe wydarzenie nigdy nie dostaje biletu.

**Plan naprawy**

1. **Wyodrębnić wspólny helper wysyłki biletu** do `supabase/functions/_shared/free-event-ticket.ts`:
   - `buildTicketEmail`, `sendSmtp` (z obsługą załącznika PDF),
   - `issueFreeTicketForOrder(supabase, orderId)` — generuje PDF (`generate-event-ticket-pdf`), wysyła maila z biletem przez aktywne `smtp_settings`, ustawia `ticket_sent_at`.
   Refaktor `confirm-free-event-reservation` aby korzystała z tego helpera (bez zmian funkcjonalnych).

2. **Rozszerzyć `confirm-event-form-email`**:
   - Po sukcesie potwierdzenia, jeśli wydarzenie ma `is_free = true`:
     a) Sprawdzić, czy dla tego zgłoszenia istnieje już `paid_event_orders` (po `submitted_data.order_id` lub po `event_id + email + source='form_free'`). Jeśli nie — utworzyć nowy wiersz `paid_event_orders`:
        - `event_id`, `ticket_id` = aktywny darmowy bilet wydarzenia (`price_pln = 0`, `is_active = true`), fallback: pierwszy aktywny,
        - `email`, `first_name`, `last_name`, `phone` ze zgłoszenia,
        - `quantity = 1`, `total_amount = 0`, `status = 'paid'`,
        - `email_confirmed_at = now`, `ticket_code` = wygenerowany kod, `ticket_generated_at = now`,
        - powiązanie ze zgłoszeniem zapisać w `submitted_data.order_id` (update zgłoszenia).
     b) Wstawić `paid_event_order_attendees` (seat 1) z danymi gościa i `ticket_code`.
     c) Uruchomić w tle `issueFreeTicketForOrder(orderId)` (PDF + email z biletem) używając `EdgeRuntime.waitUntil`.
   - Nie blokuje to istniejącego flow powiadomień admina/CRM.

3. **Idempotencja**:
   - Jeśli order już istnieje i ma `ticket_sent_at` → nie wysyłać ponownie.
   - Jeśli istnieje ale brak `ticket_sent_at` → tylko wywołać `issueFreeTicketForOrder`.

4. **Backfill dla Jana Kowala**:
   - Jednorazowy zabieg: utworzyć ręcznie `paid_event_orders` + `attendees` dla zgłoszenia `049da202-...` i wywołać `issueFreeTicketForOrder` (przez krótki skrypt edge function lub bezpośrednio przez RPC po deployu). Alternatywnie nowa logika z punktu 2 zostanie automatycznie odpalona, jeśli admin „wyśle ponownie" maila potwierdzającego — ale prościej będzie zrobić jednorazowy backfill skryptem.

5. **Brak zmian w bazie danych** — wszystkie kolumny już istnieją.

**Co zostanie zmienione**

- nowy plik: `supabase/functions/_shared/free-event-ticket.ts` (helper),
- edytowany: `supabase/functions/confirm-free-event-reservation/index.ts` (użycie helpera),
- edytowany: `supabase/functions/confirm-event-form-email/index.ts` (tworzenie zamówienia + wysyłka biletu dla `is_free=true`),
- jednorazowy backfill dla istniejących potwierdzonych zgłoszeń bez biletu.