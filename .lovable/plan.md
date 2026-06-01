# Dlaczego partnera nie widać i nie ma biletu

## Diagnoza (zweryfikowane w bazie)

Rezerwacja Sebastiana istnieje w `paid_event_orders`:
- `user_id = 629a2d9a-…` (zalogowany partner), `email = sebastiansnopek87@gmail.com`
- `status = awaiting_email_confirmation`
- `email_confirmed_at = NULL`, `ticket_sent_at = NULL`

Dwa niezależne problemy:

1. **Brak na liście „Zgłoszenia: Rejestracja"** — ta lista czyta tylko z tabeli `event_form_submissions` (czyli formularzy gościa). Rezerwacje zalogowanych partnerów lądują w `paid_event_orders` i są pomijane.
2. **Brak biletu** — zalogowany partner ma w profilu zweryfikowany e-mail, ale flow `register-free-event-order` mimo to wymaga ponownego kliknięcia w mail potwierdzający. Dopóki nie kliknie, status zostaje `awaiting_email_confirmation`, bilet się nie generuje i nie wysyła.

## Plan naprawczy

### 1. Zalogowany partner → bilet od razu, bez potwierdzania maila

W `supabase/functions/register-free-event-order/index.ts`:

- Po weryfikacji JWT (jeśli `user_id` istnieje i e-mail w `auth.users` jest potwierdzony lub e-mail z zamówienia = e-mail konta), tworzyć zamówienie od razu ze statusem `confirmed`:
  - `email_confirmed_at = now()`
  - Wygenerować `ticket_code` i bilet PDF (ta sama ścieżka co w `confirm-free-event-reservation`).
  - Wysłać mail „Twój bilet na wydarzenie" zamiast „Potwierdź adres e-mail".
  - Ustawić `ticket_sent_at = now()`.
- Dla niezalogowanych gości — bez zmian (dalej flow z potwierdzeniem e-mail).
- Frontend `PurchaseDrawer`: jeśli odpowiedź zawiera `ticket_code`/`auto_confirmed: true`, pokazać banner: *„Miejsce zarezerwowane. Bilet z kodem QR został wysłany na Twój e-mail."* zamiast komunikatu o potwierdzeniu.

### 2. Admin „Zgłoszenia: Rejestracja" — pokazuje też partnerów

W `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx`:

- Dociągnąć dodatkowo `paid_event_orders` dla `event_id = form.event_id` (z wyłączeniem `status = cancelled` jeśli zakładka nie filtruje anulowanych — utrzymać tę samą logikę co dla submissions).
- Zmapować order → wiersz listy zgodny ze schematem submissions:
  - `id` (z prefiksem `order:` żeby uniknąć kolizji)
  - `created_at`, `email`, `first_name`, `last_name`, `phone`
  - `payment_status` ← mapowanie:
    - `confirmed` / `paid` → `paid`
    - `awaiting_email_confirmation` / `awaiting_transfer` / `pending` → `pending`
    - `cancelled` → `cancelled`
    - `refunded` → `refunded`
  - `email_status`: `confirmed` jeśli `email_confirmed_at`, inaczej `sent`
  - `email_confirmed_at`, `cancelled_at`
  - `partner_user_id` ← `user_id` (sam partner jest jednocześnie zapisanym)
  - Dodatkowo `__source: 'order'` + `ticket_code` żeby UI wiedział, że to zamówienie
- Scalić oba źródła w jedną listę, sortować po `created_at` malejąco.
- Liczniki zakładek (Wszystkie / Goście / Partnerzy) liczyć po połączonym zbiorze — partner = wiersz pochodzący z `paid_event_orders` z `user_id`, lub submission z dopasowanym `profiles.email`.
- W kolumnie „Osoba" dla wiersza pochodzącego z `paid_event_orders` z `user_id` pokazać badge „Partner" (zamiast „Gość").
- W kolumnie „Partner zapraszający" dla partnera użyć istniejącej logiki `getInvitingPartner` (upline z profilu).
- W kolumnie „Akcje":
  - Dla wierszy `order:*` ukryć przyciski specyficzne dla submissions (przypisanie partnera, ponowna wysyłka maila potwierdzenia formularza, usunięcie z `event_form_submissions`).
  - Dodać link „Bilet" (otwiera `ticket_code` w `TicketPage`) gdy `ticket_code` istnieje.
- Export Excel: dorzucić te same wiersze do AOA z poprawnym mapowaniem statusów.

### 3. Backfill bieżącej rezerwacji Sebastiana

Migracja jednorazowa (data update — przez insert tool):

```
UPDATE paid_event_orders
SET status = 'confirmed', email_confirmed_at = now()
WHERE id = '1e5a3a26-4eac-4db4-b26b-d953944b9d07'
  AND status = 'awaiting_email_confirmation';
```

Następnie wywołanie istniejącej funkcji `confirm-free-event-reservation` (lub bezpośrednio `generate-event-ticket-pdf` + wysyłka maila) dla tego zamówienia, żeby otrzymał bilet bez potrzeby klikania w stary link.

## Pliki do zmiany

- `supabase/functions/register-free-event-order/index.ts` — auto-confirm dla zalogowanych
- `src/components/paid-events/public/PurchaseDrawer.tsx` — obsługa `auto_confirmed`
- `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx` — scalanie z `paid_event_orders`
- jednorazowy update danych dla istniejącej rezerwacji
