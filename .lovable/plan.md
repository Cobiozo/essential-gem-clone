## Diagnoza

`sebastiansnopek.ekology@...` zarezerwował bilet "REZERWUJĘ BILET" (20 zł, przelew) na wydarzeniu "Kompleksowe szkolenie TEST". Wydarzenie ma flagę `is_free = true` (bilet ma własną cenę przez per-ticket override). Flow:

1. `register-event-transfer-order` poprawnie utworzył order ze `status='awaiting_transfer'` i wysłał e-mail z danymi do przelewu + przyciskiem **"Potwierdzam otrzymanie wiadomości"**. ✅
2. Partner kliknął przycisk → `confirm-event-form-email` odpalił `confirm_event_form_email` RPC (potwierdzenie e-maila) → następnie, ponieważ `event.is_free === true`, wywołał **`ensureFreeOrderAndSendTicket`**.
3. `ensureFreeOrderAndSendTicket` znalazł istniejący order po `event_id + email` (ten transferowy, 20 zł, awaiting_transfer), ustawił `payment_status='paid'`, `email_status='confirmed'` na submission i wywołał `issueFreeTicketForOrder` → **wysłał bilet PDF + QR mimo braku zaksięgowania przelewu**. ❌

To jest błąd: logika "free event" nie rozróżnia biletów wymagających przelewu (per-ticket override z ceną > 0).

Dodatkowo: `admin-mark-event-payment` aktualizuje tylko `event_form_submissions.payment_status` — **nie** wystawia biletu ani nie aktualizuje `paid_event_orders.status`. Po naprawie głównego błędu, admin musi mieć możliwość wysłania biletu w momencie potwierdzenia płatności.

---

## Plan

### 1. `supabase/functions/confirm-event-form-email/index.ts`

W funkcji `ensureFreeOrderAndSendTicket` — przed wywołaniem `issueFreeTicketForOrder` sprawdzić znaleziony order:

- Jeśli istnieje order powiązany z submission (po `submitted_data.order_id` LUB po `event_id + email`) i ma **`payment_provider = 'transfer'`** LUB **`status = 'awaiting_transfer'`** LUB **`total_amount > 0`** → traktować jako "rezerwacja przelewem":
  - zaktualizować na orderze tylko `email_confirmed_at = now()` (potwierdzenie odbioru maila, bez zmiany statusu płatności),
  - **NIE** ustawiać `payment_status='paid'` na submission — pozostawić `'pending'`,
  - ustawić `email_status='confirmed'` na submission (potwierdzenie e-maila to OK),
  - **NIE** wywoływać `issueFreeTicketForOrder`,
  - powiadomienie do admina i partnera o potwierdzeniu e-maila — bez zmian.

- Tylko gdy `total_amount = 0` i nie ma przelewu → uruchomić stary flow (auto-paid + ticket PDF). Czyli prawdziwie bezpłatny bilet bez przelewu działa jak dotąd.

### 2. `supabase/functions/admin-mark-event-payment/index.ts`

Rozszerzyć tak, by przy `paymentStatus === 'paid'`:

- Znaleźć powiązany order(y) (z `event_form_submissions.submitted_data.order_ids` lub `order_id`).
- Dla każdego z `payment_provider='transfer'` i `status='awaiting_transfer'`:
  - zaktualizować `paid_event_orders` → `status='paid'`, `paid_at=now()`,
  - wywołać `issueFreeTicketForOrder(order_id)` (shared helper) — wystawi PDF + QR i wyśle e-mail z biletem,
  - dodać activity log "Wysłano bilet po zaksięgowaniu przelewu".
- Best-effort: pojedynczy błąd wysyłki nie blokuje aktualizacji statusu (loguje się i wraca z `ticket_send_warning` w odpowiedzi).

Brak zmian w UI panelu admina — przycisk "Opłacono" już istnieje i wywołuje tę funkcję.

### 3. Naprawienie istniejącego rekordu testowego (data fix, jednorazowo)

Dla `sebastiansnopek.ekology@gmail.com` na "Kompleksowe szkolenie TEST":
- `UPDATE paid_event_orders SET status='awaiting_transfer', ticket_sent_at = NULL WHERE id = <ten order>`,
- `UPDATE event_form_submissions SET payment_status='pending' WHERE ...`.

(Wykonane przez insert tool po akceptacji.)

---

## Efekt końcowy (zgodny z wymaganiem)

Logowany partner z biletem **przelew**:

1. Klika "Rezerwuję" → dostaje mail z danymi do przelewu i linkiem "Potwierdzam otrzymanie wiadomości".
2. Klika link potwierdzenia → strona pokazuje "Twoje dane zostały potwierdzone"; status submission = email confirmed, payment_status = pending; **bilet nie idzie**.
3. Admin w panelu klika "Opłacono" przy zgłoszeniu → dopiero wtedy order zmienia się na `paid` i automatycznie wysyłany jest e-mail z biletem PDF + QR.

Gość z biletem **darmowym (0 zł, bez przelewu)** — flow bez zmian: po potwierdzeniu e-maila bilet idzie od razu.
