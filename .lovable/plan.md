## Diagnoza

Sprawdziłem zamówienie w bazie (`sebastiansnopek87@gmail.com`, BOM Łódź):

- W bazie: `quantity = 1`, `seats_per_ticket = 1`, `total_amount = 3500 gr (= 35 zł)`, **liczba uczestników w `paid_event_order_attendees` = 0**.
- W emailu: pojedyncza linia „Bilet: …", kwota 35 zł, brak sekcji uczestników.
- W UI potwierdzenia: „otrzymasz 2 biletów QR" — tylko dlatego że frontend obliczał `totalSeats` z lokalnego `quantity`, a kliknięcie „+" nie zostało wysłane do backendu (lub funkcja nie była przedeployowana po ostatnich zmianach).

Czyli realnie: w bazie zapisany jest **1 bilet za 35 zł**, a użytkownik był w UI przekonany, że bierze 2. Trzy realne problemy do naprawy:

1. **Email nie pokazuje liczby biletów ani uczestników** — nawet gdy `quantity > 1` lub gdy mamy więcej miejsc, treść maila wygląda identycznie jak dla 1 biletu.
2. **Tabela `paid_event_order_attendees` jest pusta** dla tego zamówienia — albo funkcja nie była przedeployowana, albo insert padł cicho. Wymaga redeploy + log check + walidacji.
3. **Niespójność „2 biletów QR" w UI vs `quantity=1` w backendzie** — UI pokazuje sukces zanim backend potwierdzi co realnie zapisał.

## Zakres zmian

### 1. `supabase/functions/register-event-transfer-order/index.ts`

- Email: zawsze pokazuj sekcję „Podsumowanie zamówienia" z trzema liniami:
  - `Bilet: <ticket.name>`
  - `Liczba biletów: <quantity> × <cena> = <łączna kwota>` (gdy `quantity > 1` lub `seats_per_ticket > 1`)
  - `Liczba uczestników: <totalSeats>` (gdy `totalSeats > 1`)
- Lista uczestników: rendering przy `totalSeats > 1` (nie tylko `attendees.length > 1`) — gwarantuje że nawet gdy w `attendeesNormalized` jest sam kupujący jako placeholder, sekcja się pokaże z poprawnym opisem „1. Jan Kowalski (kupujący)" + pozostałe „Uczestnik #N — dane do uzupełnienia".
- Logowanie: jeśli `attendeeRows.length !== totalSeats` lub insert do `paid_event_order_attendees` zwraca błąd — log ERROR + zwróć ostrzeżenie w odpowiedzi (nie blokuj zamówienia).
- Temat maila: dodaj liczbę biletów gdy > 1 (`Rezerwacja przyjęta – N biletów – <event>`).

### 2. `supabase/functions/payu-create-order/index.ts`

Identyczna logika walidacji liczby uczestników i logowania — żeby zachować spójność, ale bez zmian w treści maila (PayU nie wysyła rezerwacji-emaila).

### 3. `src/components/paid-events/public/PurchaseDrawer.tsx`

- Po sukcesie: pokaż w komunikacie potwierdzenia dokładnie tę liczbę co poszła do backendu — `quantity` i `totalSeats` z payloadu, nie z lokalnego state.
- Przy `quantity > 1` lub `seats_per_ticket > 1` pokaż w „Podsumowaniu zamówienia" rozbicie: `<quantity> × <cena> = <łączna kwota>`.
- Mała walidacja przy submit: jeśli wybrano > 1 bilet, dodaj subtelne potwierdzenie „Rezerwujesz 2 bilety za 70 zł — kontynuować?" (toast info, nie blokujący modal).

### 4. Redeploy + weryfikacja

- Przedeployować `register-event-transfer-order` i `payu-create-order` po zmianach.
- Po deploy: zrobić testową rezerwację 2 biletów i sprawdzić:
  - `paid_event_orders.quantity = 2`
  - `paid_event_order_attendees` ma 2 rekordy z unikalnymi `ticket_code`
  - email zawiera „Liczba biletów: 2 × 35,00 zł = 70,00 zł" i listę uczestników

## Co NIE wchodzi w zakres

- Zmiany schematu bazy (nie potrzebne).
- Edycja danych uczestników po rezerwacji (osobna iteracja).
- Naprawa już istniejącego zamówienia `2848e86d…` — to było 1 bilet w bazie. Jeśli użytkownik chciał faktycznie 2, trzeba ręcznie dorzucić drugiego uczestnika lub utworzyć drugą rezerwację.

## Pliki do edycji

- `supabase/functions/register-event-transfer-order/index.ts` — sekcja `buildEmail` + walidacja attendees + temat maila
- `supabase/functions/payu-create-order/index.ts` — walidacja + log
- `src/components/paid-events/public/PurchaseDrawer.tsx` — rozbicie ceny + komunikat sukcesu
