## Co znalazłem (dwa niezależne problemy)

### 1. Mail z biletem NIE doszedł — wina SMTP, nie rejestracji
Logi `confirm-free-event-reservation` pokazują:
```
ERROR [confirm-free-event-reservation] email send failed
Error: Send failed: 421 s108.cyber-folks.pl SMTP incoming data timeout - closing connection.
```
- Zamówienie `4dc5e8fc…` ma `status: 'paid'`, `email_confirmed_at` ustawione, ale `ticket_sent_at = NULL`.
- Przyczyna: w `sendSmtp` całe ciało wiadomości (mail + base64 PDF biletu, kilkaset kB) wysyłane jest w jednym `conn.write` do `s108.cyber-folks.pl`. Serwer SMTP cyberfolks zamyka połączenie z błędem `421 incoming data timeout`, zanim zdąży odebrać całość.
- Drugi free-event mail (potwierdzenie e-mail bez załącznika) najprawdopodobniej przeszedł — ale ten z PDF konsekwentnie pada.

### 2. „Ślady" po usuniętej rejestracji
`admin-delete-event-order` po ostatniej iteracji już sprząta `paid_event_orders` (kaskada do attendees), `event_registrations`, `guest_event_registrations`. Ale ślad zostaje w innych miejscach, które blokują/myli ponowną rejestrację oraz UI:
- `event_form_submissions` — formularz rejestracyjny eventu (1:1 z mailem/eventem). Po usunięciu zostaje i powoduje, że UI nadal pokazuje „Masz zarezerwowane miejsce".
- `paid_event_order_history` / `paid_event_order_attendees` — kaskady, OK, ale warto potwierdzić.
- `user_notifications` (typ `event_form_*`, `paid_event_*`) — luźne notyfikacje partnera/admina dla tej rejestracji.
- `team_contacts` notes — zostawiamy (to CRM, użytkownik chce historię), ale można dopisać linijkę „❌ Rejestracja usunięta przez administratora".

To samo trzeba zrobić w `admin-cancel-event-order` w trybie „twardego" anulowania (obecnie tylko zmienia status na `cancelled` — co nadal blokuje ponowną rejestrację, bo `register-free-event-order` szuka `status in (awaiting_email_confirmation, confirmed, paid, completed)`; `cancelled` nie blokuje, więc tu jest OK — zostawiamy bez zmian).

---

## Plan napraw

### A. Naprawa wysyłki maila z biletem (priorytet)
Plik: `supabase/functions/confirm-free-event-reservation/index.ts` (oraz analogicznie wszędzie gdzie ten sam `sendSmtp` z załącznikiem jest używany — `generate-event-ticket-pdf` wywołuje to pośrednio; sprawdzę też `register-event-transfer-order` i `_shared/free-event-ticket.ts`).

1. Wprowadzić streaming write w `sendSmtp`:
   - po `DATA` wysyłać body w kawałkach (np. 32 kB) z `await conn.write` w pętli, BEZ czytania po każdym kawałku (SMTP czeka na `.<CRLF>`).
   - na koniec wysłać `\r\n.\r\n` i dopiero wtedy `await read()`.
   - dodać explicit `withTimeout` (np. 60 s) na cały send body.
2. Dodać fallback bez załącznika: jeśli `sendSmtp` z PDF się wywali (timeout/421), spróbować jeszcze raz BEZ załącznika z wyraźnym linkiem do biletu (`ticketViewUrl` + `pdfDownloadUrl`). Wiadomość dotrze zawsze, a użytkownik pobierze PDF z linka.
3. Po sukcesie ustawić `ticket_sent_at`. Po finalnej porażce (z fallbackiem włącznie) logować i dodawać powiadomienie admina (`user_notifications` typ `ticket_email_failed`) z linkiem do zamówienia.
4. Resend: `admin-resend-free-ticket` korzysta z `_shared/free-event-ticket.ts` — ten sam fix musi obowiązywać tam.

### B. Pełne czyszczenie śladu rejestracji przy usunięciu
Plik: `supabase/functions/admin-delete-event-order/index.ts` — rozszerzyć po skasowaniu `paid_event_orders`:
1. `event_form_submissions` — `DELETE` wszystkich rekordów dla pary `(event_id, lower(email))` oraz, jeśli `user_id` istnieje, dla `(event_id, partner_user_id=user_id)` — bo gość/partner mógł najpierw wypełnić ogólny formularz.
2. `user_notifications` — `DELETE` z `metadata->>'order_id' = $orderId` lub `(metadata->>'event_id' = $eventId AND metadata->>'email' = $email)` ograniczone do `source_module IN ('paid_events','event_forms')`.
3. `paid_event_order_history` — `DELETE` po `order_id`.
4. (Opcjonalnie) `suppressed_emails` — NIE ruszamy automatycznie. Dodać UWAGĘ w odpowiedzi funkcji, jeśli email tej osoby jest na liście suppression, żeby admin wiedział, czemu mail mimo wszystko nie pójdzie.
5. Wszystko wykonywane przez `service_role` z `try/catch` per krok i agregowanym podsumowaniem w odpowiedzi (`{ deleted: { orders: 1, form_submissions: N, notifications: N, ... } }`), żeby admin widział, co zostało wyczyszczone.

### C. Re-rejestracja partnera / gościa
Po B. ponowna rejestracja przez `register-free-event-order` zadziała bo:
- brak `paid_event_orders` ze statusem aktywnym → przejdzie walidację „already_registered".
- brak `event_form_submissions` → UI (`MyEventTicketsInline`, `PurchaseDrawer`) nie pokaże „Masz zarezerwowane miejsce".
- email z biletem dojdzie dzięki A.

### D. Weryfikacja
1. Ręcznie usunąć przez admina rejestrację gościa i partnera dla tego samego eventu.
2. Sprawdzić w bazie: `paid_event_orders`, `event_form_submissions`, `event_registrations`, `guest_event_registrations`, `user_notifications` — 0 rekordów dla tej pary event/email.
3. Wykonać ponowną rejestrację — sprawdzić, że przychodzi mail potwierdzający (gość) lub mail z biletem PDF (partner zalogowany).
4. Sprawdzić logi `confirm-free-event-reservation` / `register-free-event-order` na brak błędów `421`.

---

## Pliki do zmiany
- `supabase/functions/confirm-free-event-reservation/index.ts` — przebudowa `sendSmtp` (chunked write + fallback bez załącznika).
- `supabase/functions/_shared/free-event-ticket.ts` — ten sam fix dla resendu.
- `supabase/functions/register-event-transfer-order/index.ts` — jeśli używa lokalnego `sendSmtp` z załącznikiem, też podmienić.
- `supabase/functions/admin-delete-event-order/index.ts` — dodatkowe `DELETE`: `event_form_submissions`, `user_notifications`, `paid_event_order_history`.
- (bez zmian) `admin-cancel-event-order/index.ts` — obecny `status='cancelled'` już nie blokuje re-rejestracji.

Po zatwierdzeniu wchodzę w build mode i implementuję.