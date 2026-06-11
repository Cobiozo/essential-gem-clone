
## Cel

1. Zalogowany użytkownik (partner / klient / specjalista / gość PLC) może mieć tylko JEDNĄ rezerwację jako uczestnik na to samo wydarzenie — niezależnie od tego, czy bilet jest płatny, czy darmowy. Druga próba ma być zablokowana z czytelnym komunikatem.
2. Gdy konto użytkownika zostanie usunięte (anonimizacja albo trwałe usunięcie), wszystkie jego rezerwacje / bilety mają pozostać w panelu admina i podczas weryfikacji biletu (QR) — ale z wyraźnym oznaczeniem „Konto usunięte".

---

## Część 1 — Blokada podwójnej rezerwacji (płatne i darmowe)

### Frontend (`src/components/paid-events/public/PurchaseDrawer.tsx`)

- Hook `hasOwnTicket` już istnieje (sprawdza `paid_event_orders` po `user_id` + e-mail oraz `event_form_submissions`). Rozszerzamy go o `paid_event_order_attendees` po e-mailu zalogowanego użytkownika — to wyłapuje przypadek z obrazka, gdzie user dodał siebie jako „gościa" na drugim bilecie.
- Twardy guard `if (isFree && hasOwnTicket)` rozszerzamy na WSZYSTKIE bilety (też płatne) — gdy `hasOwnTicket=true`:
  - tryb „guest-only" zostaje (może kupić bilety dla innych),
  - ale walidacja blokuje dodanie zalogowanego użytkownika (jego e-mail) na liście uczestników; pokazujemy toast: „Masz już rezerwację na to wydarzenie — kolejny bilet możesz kupić tylko dla innej osoby.".

### Backend — `supabase/functions/create-event-order/index.ts` + `register-free-event-order`

- Z nagłówka `Authorization` pobieramy `userId` (jeśli zalogowany).
- Przed insertem zamówienia sprawdzamy duplikaty dla tego eventu:
  - aktywne rekordy w `paid_event_orders` po `user_id` lub `email` kupującego,
  - aktywne rekordy w `paid_event_order_attendees` (JOIN na orders) po e-mailu kupującego lub po e-mailach z `attendees[]`,
  - aktywne `event_form_submissions` po tych samych e-mailach.
- Jeśli którykolwiek e-mail uczestnika lub kupującego już ma aktywną rezerwację → zwracamy 200 z `{ error: 'already_registered', message: 'Adres X jest już zarejestrowany na to wydarzenie.' }`, transakcja nie powstaje.
- Zapisujemy `user_id` na `paid_event_orders` przy tworzeniu (dzisiaj nie jest ustawiane — dlatego duplikaty się prześlizgują).

---

## Część 2 — Oznaczanie biletów po usunięciu konta

### Migracja (jedna)

Dodajemy kolumny śladu „konto usunięte" tam, gdzie trzymamy bilety i rezerwacje:

- `paid_event_orders`: `account_deleted_at timestamptz`, `account_deleted_action text` (`anonymized` | `deleted`), `account_deleted_snapshot jsonb` (imię, nazwisko, e-mail, role z chwili usunięcia).
- `paid_event_order_attendees`: te same trzy kolumny (per miejsce/bilet — bo każdy attendee może mieć inny e-mail).
- `event_form_submissions`: te same trzy kolumny.
- `guest_event_registrations`: te same trzy kolumny.

Bez zmian RLS / GRANT (te tabele już mają polityki).

### Edge function `admin-finalize-account-deletion`

Zarówno gałąź `anonymize`, jak i `delete`:

1. Przed czyszczeniem FK pobieramy snapshot profilu (`first_name`, `last_name`, `email`, role z `user_roles`).
2. Dla każdej z czterech tabel wykonujemy UPDATE po `user_id` (orders + form_submissions + guest_registrations) i po e-mailu (attendees) ustawiając trzy nowe kolumny.
3. Dotychczasowy `update({ user_id: null })` zostaje (FK puste), ale dane biletu pozostają nietknięte — nie kasujemy ich.
4. Cron `cron-purge-pending-deletions` (gdy upłynie 30 dni) wykonuje to samo + auth.deleteUser.

### Panel admina

- `PaidEventsOrders` (zamówienia płatnych eventów) i lista zamówień: pokazujemy badge „Konto usunięte" (czerwony) obok imienia/e-maila gdy `account_deleted_at IS NOT NULL`, z tooltipem zawierającym datę i akcję (anonymized/deleted) oraz snapshot.
- Lista uczestników (attendees) — ten sam badge per uczestnik.
- Lista rezerwacji w `EventFormsList` (darmowe eventy) i `GuestEventRegistrations` — analogiczny badge.

### Weryfikacja biletu (QR)

- `TicketVerificationPanel` / edge `verify-event-ticket`: gdy `account_deleted_at IS NOT NULL` na zamówieniu lub na attendee → w odpowiedzi dodajemy flagę `account_deleted` + treść snapshotu.
- W UI weryfikatora pokazujemy wyraźny żółty/czerwony pas: „Bilet wydany dla konta, które zostało usunięte (anonimizacja/usunięcie dnia …)". Bilet nadal można zweryfikować (ważność biletu = własność wydarzenia), ale weryfikator widzi sytuację jednoznacznie.

---

## Pliki do zmiany

- `supabase/migrations/<new>.sql` — nowe kolumny + indeksy.
- `supabase/functions/create-event-order/index.ts` — guard duplikatów + zapis `user_id`.
- `supabase/functions/register-free-event-order/index.ts` — guard duplikatów uczestników (już ma e-mail, dodajemy też dla attendees).
- `supabase/functions/admin-finalize-account-deletion/index.ts` — snapshot + stempel.
- `supabase/functions/cron-purge-pending-deletions/index.ts` — to samo dla auto-purge.
- `supabase/functions/verify-event-ticket/index.ts` — zwracanie flagi `account_deleted`.
- `src/components/paid-events/public/PurchaseDrawer.tsx` — rozszerzona walidacja.
- `src/components/admin/paid-events/PaidEventsOrders.tsx` + komponent listy attendees — badge „Konto usunięte".
- `src/components/admin/event-forms/EventFormsList.tsx` (i widoki rezerwacji gości) — badge.
- `src/components/ticket-verification/TicketVerificationPanel.tsx` — pas ostrzeżenia w wyniku weryfikacji.

---

## Co celowo zostaje bez zmian

- Polityki RLS (działają, dodajemy tylko kolumny).
- Logika płatności PayU / BLIK — niezmieniona.
- Mechanika 30-dniowego okna soft-delete (już wdrożona) — wyłącznie poszerzamy o stempel na biletach.
