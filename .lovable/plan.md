## Stan obecny

- ✅ Wyższy plan Supabase włączony
- ✅ Wdrożone `register-event-transfer-order` i `payu-create-order` z poprawkami:
  - prawdziwa `quantity` w mirrorze do `event_form_submissions` (zamiast hardcoded `1`)
  - twardy błąd, jeśli insert do `paid_event_order_attendees` się nie powiedzie (rollback zamówienia)
  - wymuszenie trybu „guest-only", jeśli kupujący ma już bilet
- ✅ `PurchaseDrawer` odświeża listę „Moje bilety" po zakupie
- ✅ Sekcja „Moje bilety" pokazuje listę uczestników z opcją edycji gości

## Co jeszcze trzeba zrobić

### 1. Naprawa istniejących błędnych zamówień (SQL migracja)

Twoje ostatnie zamówienie `sebastiansnopek87@gmail.com` ma `quantity=1, total_amount=3500`, choć kupowałeś 2 bilety za 70 zł. Plus brak rekordów w `paid_event_order_attendees`.

Migracja:
- Zaktualizuje to zamówienie: `quantity = 2`, `total_amount = 7000`
- Utworzy 2 brakujące rekordy uczestników (seat 1 = kupujący, seat 2 = `Gość #2` do uzupełnienia)
- Zsynchronizuje `event_form_submissions.submitted_data` (`quantity`, `total_seats`, `total_amount_pln`)
- Wygeneruje unikalne `ticket_code` dla brakujących uczestników

Najpierw potwierdzę ID konkretnego zamówienia zapytaniem SQL, potem dopiero migracja.

### 2. Sekcja „Pokaż zapisanych" na karcie eventu (`MyEventFormReferrals.tsx`)

Obecnie ta sekcja ciągnie tylko z `event_form_submissions` i nie pokazuje rzeczywistych uczestników z zakupów biletów.

Zmiana: dla każdego zgłoszenia powiązanego z zakupem biletów (po `event_id` + email kupującego) dociągnąć rekordy z `paid_event_orders` + `paid_event_order_attendees` i wyświetlić:
- Ciebie jako kupującego/uczestnika z badge „Ty" (gdy `email = auth.user.email`)
- Listę gości z imieniem/nazwiskiem (lub etykietą „Gość #N — uzupełnij")
- Liczbę i kwotę biletów obok imienia kupującego

### 3. (Opcjonalnie) Test end-to-end

Po naprawie danych — przejście na `/paid-events` powinno pokazać sekcję „Moje bilety" z poprawnym zamówieniem (2 bilety, 70 zł, lista uczestników z edycją).

## Pliki do zmiany

- `supabase/migrations/<timestamp>_fix_broken_ticket_orders.sql` — naprawa danych
- `src/components/paid-events/MyEventFormReferrals.tsx` — integracja z `paid_event_orders`

## Uwagi

- Edge functions już są wdrożone, więc każdy nowy zakup od teraz zapisze się prawidłowo (2 bilety = 2 rekordy uczestników, prawidłowy `total_amount`, prawidłowy mail).
- Migracja naprawi tylko historyczne, błędne zamówienie/zamówienia.
