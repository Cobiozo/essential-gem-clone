# Bilety zbiorowe z personalizacją uczestników

## Cel
Kupujący (zalogowany partner lub gość) wybiera bilet "dla 3 / 5 / 10 osób" i podczas zakupu wpisuje imię + nazwisko (opcjonalnie email) każdej osoby, dla której bilet jest przeznaczony. Każdy uczestnik dostaje swój własny, unikalny kod QR — łatwa weryfikacja przy wejściu kto faktycznie należy do danego biletu.

## Model danych

### Nowe pole na bilecie (`paid_event_tickets`)
- `seats_per_ticket INT NOT NULL DEFAULT 1` — ile osób mieści się w jednej sztuce biletu
  - dla obecnego biletu "3x Business Opportunity Meeting" admin ustawi 3
  - dla zwykłego biletu zostaje 1 (zero zmian w UX)

### Nowa tabela `paid_event_order_attendees`
Jeden wiersz = jedna miejscówka = jeden kod QR.

| kolumna | typ | opis |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK → paid_event_orders | |
| event_id | uuid FK → paid_events | denormalizacja dla szybkich zapytań skanera |
| seat_index | int | 1..N w obrębie zamówienia |
| first_name | text NOT NULL | |
| last_name | text NOT NULL | |
| email | text NULL | opcjonalny — można wysłać bilet bezpośrednio do uczestnika |
| ticket_code | text UNIQUE | własny kod QR (12 znaków, ten sam alfabet co dziś) |
| checked_in | bool default false | |
| checked_in_at | timestamptz | |
| created_at / updated_at | | |

Indeksy: `(order_id)`, `unique(ticket_code)`, `(event_id, ticket_code)`.

RLS:
- SELECT: właściciel zamówienia (`user_id = auth.uid()`) + admin
- INSERT/UPDATE: tylko service_role (edge functions)

### Zachowanie pola `paid_event_orders.quantity`
- `quantity` = liczba **sztuk biletu** kupiona w jednym zamówieniu (jak dziś)
- liczba uczestników = `quantity * seats_per_ticket`
- dotychczasowe `ticket_code` na zamówieniu pozostaje (kompat. wsteczna), ale skaner i email priorytetyzują kody z `paid_event_order_attendees`, gdy istnieją

## Flow zakupu (PurchaseDrawer)

1. Po wybraniu biletu pokazuje się dotychczasowy formularz danych kupującego.
2. **Selektor ilości sztuk** (NOWY) — `Liczba biletów` 1..min(10, dostępne) z licznikiem osób ("3 bilety × 3 osoby = 9 uczestników, do zapłaty 315 zł").
3. **Sekcja "Uczestnicy" (NOWA)** — gdy `quantity * seats_per_ticket > 1`:
   - dynamiczna lista N par pól `Imię / Nazwisko` (+ opcjonalnie email)
   - pierwsze miejsce auto-uzupełnione danymi kupującego z możliwością edycji
   - przycisk "Skopiuj dane kupującego" przy pozostałych miejscach
   - walidacja: każde imię i nazwisko wymagane przed wysyłką
4. Reszta (zgody, PayU/przelew) bez zmian.

Drawer pozostaje w obrębie istniejących styli (dark, gold akcent) — zero ingerencji w design system.

## Backend (edge functions)

### `payu-create-order` i `register-event-transfer-order`
- nowy parametr w body: `attendees: Array<{ firstName, lastName, email? }>`
- walidacja: `attendees.length === quantity * ticket.seats_per_ticket`
- po utworzeniu rekordu w `paid_event_orders` — wstawienie N wierszy do `paid_event_order_attendees` z osobnymi `ticket_code`
- check dostępności: `available >= quantity` (sztuk), nie zmieniamy logiki magazynu

### `payu-webhook`
- gdy zamówienie przechodzi w `paid` — generujemy/odswieżamy attendees jeśli brak (idempotentnie)
- email z biletami: lista N kodów QR (jeden blok per uczestnik z imieniem i nazwiskiem) zamiast pojedynczego QR
- jeśli uczestnik podał własny email → opcjonalnie wysyłka indywidualnego biletu (faza 2, na razie wszystko idzie do kupującego w jednym mailu)

### `verify-event-ticket`
- skaner najpierw szuka kodu w `paid_event_order_attendees` — zwraca imię i nazwisko konkretnego uczestnika + status `checked_in` per miejscówka
- fallback do dotychczasowego lookupu po `paid_event_orders.ticket_code`
- check-in działa per uczestnik (każdy QR niezależnie)

## Admin (PaidEventsOrders)
- w widoku zamówienia rozwijana lista uczestników z kolumną "Check-in" per osoba
- pole `seats_per_ticket` w edytorze biletu (input liczbowy, default 1, helper text "Ile osób wchodzi na 1 sztukę biletu")

## Co pozostaje nietknięte
- struktura `paid_event_orders`, statusy, integracja PayU, RLS dotychczasowych tabel, refCode/partner tracking, magazyn (`quantity_sold`), istniejące zamówienia (działają dalej z pojedynczym `ticket_code`)
- design system, drawery, copy poza nowymi sekcjami
- inne strony i komponenty paid-events (lista, hero, sidebar)

## Migracje
1. `ALTER TABLE paid_event_tickets ADD COLUMN seats_per_ticket INT NOT NULL DEFAULT 1 CHECK (seats_per_ticket BETWEEN 1 AND 50);`
2. `CREATE TABLE paid_event_order_attendees (...)` + RLS + indeksy + trigger updated_at
3. backfill: dla istniejących zamówień nie tworzymy attendees — fallback w skanerze załatwia kompatybilność
