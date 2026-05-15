## Cel

Powyżej panelu „Twoje bilety na to wydarzenie" pokazać wyraźny pasek z informacją o własnej rejestracji zalogowanego użytkownika i łącznej liczbie zarezerwowanych miejsc na danym evencie.

## Zakres zmian

Tylko frontend, jeden plik: `src/components/paid-events/MyEventTicketsInline.tsx`. Bez zmian w bazie, RLS, edge functions ani innych panelach.

## Co zostanie dodane

Nowy blok renderowany **nad** dotychczasowym nagłówkiem „TWOJE BILETY NA TO WYDARZENIE", korzystający z danych już pobieranych przez istniejące `useQuery` (brak dodatkowych zapytań):

- Stan: zalogowany użytkownik bez aktywnych zamówień → pasek neutralny: „Nie jesteś jeszcze zarejestrowany na to wydarzenie."
- Stan: zalogowany użytkownik z co najmniej jednym aktywnym zamówieniem → pasek w kolorze primary z ikoną i tekstem:
  - linia 1 (mocna): „Jesteś zarejestrowany na to wydarzenie"
  - linia 2 (mniejsza): „Zarezerwowałeś {N} {miejsc/miejsce/miejsca} w {M} {rezerwacji/rezerwacjach}" (poprawne formy PL)
  - opcjonalny dodatek po przecinku, jeśli `inactiveTickets > 0`: „(+K anulowanych)"
  - po prawej stronie: badge z najnowszym statusem (np. „Oczekuje przelewu", „Opłacone") wyliczony z `orders[0].status` przez istniejącą funkcję `statusBadge`

`N` = suma `quantity * seats_per_ticket` po aktywnych zamówieniach (te same reguły INACTIVE co dziś). `M` = liczba aktywnych zamówień.

Istniejące:
- nagłówek „Twoje bilety na to wydarzenie" z licznikiem `{activeTickets} biletów`,
- lista zamówień z atendantami i edycją gości,
- dialog edycji uczestnika,

pozostają bez zmian — pasek pojawia się jako pierwszy element wewnątrz głównego kontenera komponentu, nad istniejącym `div` nagłówka.

## Szczegóły techniczne

- Wykorzystać istniejące `orders`, `INACTIVE`, `activeTickets`, `inactiveTickets`.
- Dodać helper `pluralPL(n, [one, few, many])` lokalnie w pliku do form „miejsce/miejsca/miejsc" i „rezerwacja/rezerwacje/rezerwacji".
- Pasek: `rounded-md border border-primary/30 bg-primary/10 p-2 flex items-center justify-between gap-2 text-xs`, ikona `Ticket` z `lucide-react` (już importowana).
- Nie renderować paska podczas `isLoading` (zostaje tylko dotychczasowy spinner) ani gdy `!user`.
- Brak zmian w `data-testid` istniejących elementów; nowy element dostaje `data-testid="my-event-registration-summary"` na potrzeby ewentualnych testów.

## Poza zakresem

- Diagnoza dlaczego dla aktualnie zalogowanego konta widać „0 biletów" mimo rezerwacji (to zależy od konta zalogowanego względem `user_id`/`email` na zamówieniu i RLS — bez zmian tutaj).
- Zmiany w sekcji „Pokaż zapisanych przez mój link".
