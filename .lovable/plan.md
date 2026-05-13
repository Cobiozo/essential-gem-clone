## Cel

Uprościć formularz uczestników przy zakupie biletu zbiorowego i pozwolić uzupełnić dane uczestników później, gdy kupujący jeszcze nie wie kogo zabierze.

## Zmiany w UI (PurchaseDrawer)

1. **Kupujący = pierwszy uczestnik**
   - Usuwam osobne pole "Uczestnik 1" — dane kupującego (Imię/Nazwisko/Email) automatycznie liczą się jako pierwszy uczestnik i pierwszy kod QR.
   - Lista dodatkowych uczestników renderuje `(quantity * seats_per_ticket) - 1` pozycji, ponumerowanych od "Uczestnik 2".
   - Przykład: bilet dla 3 osób + ilość 1 → kupujący + 2 dodatkowych uczestników.

2. **Opcjonalne dane dodatkowych uczestników**
   - Imię/Nazwisko/Email dla "Uczestnik 2..N" stają się **opcjonalne** przy zakupie.
   - Pod nagłówkiem sekcji info: "Możesz uzupełnić dane uczestników teraz lub później — z poziomu strony zamówienia. Każdy uczestnik dostanie własny kod QR."
   - Jeśli pole zostanie puste, w bazie zapisujemy `first_name = "Uczestnik"`, `last_name = "#<seat_index>"` jako placeholder (kod QR generowany od razu, dane do uzupełnienia).

3. **Usunięcie przycisku "Skopiuj kupującego"** w każdej karcie uczestnika.

## Zmiany w przepływie danych

- `PurchaseDrawer` zawsze wysyła do edge functions tablicę `attendees` o długości `quantity * seats_per_ticket`:
  - pozycja 0 = dane kupującego (z formularza "Dane kupującego"),
  - pozycje 1..N = dane z sekcji "Dodatkowi uczestnicy" (mogą być puste → backend wypełnia placeholderem).
- Walidacja przy submit: wymagamy tylko danych kupującego; pozostałe pola mogą być puste.

## Edge functions

- `payu-create-order` i `register-event-transfer-order`: bez zmian w kontrakcie API. Dodajemy normalizację — jeśli `firstName`/`lastName` puste, zapisujemy `Uczestnik` / `#<seat_index>` w `paid_event_order_attendees`. Email opcjonalny (już jest).
- `verify-event-ticket`: bez zmian — kod QR działa od razu, na bramce widać placeholder lub uzupełnione dane.

## Późniejsze uzupełnianie danych (poza zakresem tej iteracji)

Edycja danych uczestnika po zakupie (np. na stronie "Moje zamówienia") to osobny krok — zaproponuję go w kolejnym planie po zatwierdzeniu tej zmiany. Tutaj dostarczamy fundament: placeholder + indywidualne kody QR.

## Pliki do edycji

- `src/components/paid-events/public/PurchaseDrawer.tsx` — UI uczestników, walidacja, mapowanie kupującego na seat 1, usunięcie przycisku kopiowania.
- `supabase/functions/payu-create-order/index.ts` — normalizacja pustych imion/nazwisk.
- `supabase/functions/register-event-transfer-order/index.ts` — j.w. + email rezerwacji wyświetla placeholder gdy brak danych.

Brak zmian w schemacie bazy.
