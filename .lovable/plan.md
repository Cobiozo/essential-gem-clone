## Cel

Zalogowany użytkownik (klient / specjalista / partner / gość PLC), który ma już rezerwację/bilet na dane wydarzenie, nie może otworzyć formularza rejestracyjnego po raz drugi. Próba kliknięcia „Rezerwuję" / „Kup bilet" pokazuje komunikat „Masz już rezerwację na to wydarzenie", a formularz w ogóle się nie otwiera.

Obecnie `PurchaseDrawer` wykrywa istniejący bilet (`hasOwnTicket`) tylko po otwarciu — i jedynie blokuje pola kupującego, ale formularz nadal się pojawia (sytuacja widoczna na zrzucie ekranu Józefa Pyzy).

## Zmiany

### 1. Nowy hook `useHasOwnEventTicket(eventId)`
- Plik: `src/hooks/useHasOwnEventTicket.ts`
- Wyodrębnia istniejącą logikę z `PurchaseDrawer` (sprawdzenie `paid_event_orders` own + email, `paid_event_order_attendees`, `event_form_submissions`), zawsze z filtrem `account_deleted_at IS NULL` i wykluczeniem statusów `cancelled/refunded/failed/expired`.
- Zwraca `{ hasTicket, isLoading }`.
- Używany przez `PaidEventPage` oraz `PurchaseDrawer` (DRY, jedno źródło prawdy).

### 2. `src/pages/PaidEventPage.tsx`
- Wywołuje `useHasOwnEventTicket(event.id)`.
- W `handlePurchase`:
  - jeżeli `hasTicket === true` → nie otwiera drawer'a, pokazuje `toast({ title: 'Masz już rezerwację na to wydarzenie', description: 'Każdy użytkownik może zarezerwować bilet na to wydarzenie tylko raz. Sprawdź swoje bilety powyżej.' })` i przewija stronę do panelu „Twoje bilety na to wydarzenie".
  - w przeciwnym razie — działa jak dziś.
- Przyciski rezerwacji w sekcji biletów (w `PaidEventSidebar` / kartach biletów) przyjmują nowy prop `disabledReason` lub po prostu są wyłączone z etykietą „Masz już rezerwację", gdy `hasTicket === true` (z wyjątkiem podglądu admina, który dzisiaj już widzi wszystko).

### 3. `src/components/paid-events/public/PurchaseDrawer.tsx`
- Zastępuje wewnętrzną `useQuery` o `hasOwnTicket` wywołaniem nowego hooka (zachowując dokładnie tę samą logikę zapytań).
- Dodatkowy bezpiecznik: jeśli drawer został otwarty (np. przez stary cache) i `hasTicket === true`, renderuje wyłącznie komunikat „Masz już rezerwację na to wydarzenie" + przycisk „Zamknij", zamiast formularza. To zabezpiecza przed race condition między pierwszym kliknięciem a załadowaniem flagi.

### 4. Brak zmian w bazie / edge functions
- Cała logika pozostaje po stronie frontu; reguły izolacji kont usuniętych z poprzednich kroków (`account_deleted_at IS NULL`, dopasowanie po emailu tylko dla `user_id IS NULL`) są zachowane, więc nowe konto z recyklowanym mailem nigdy nie odziedziczy historii usuniętego konta.

## Zakres działania reguły

- Dotyczy wszystkich zalogowanych ról (klient, specjalista, partner, gość PLC, leader). Admin w trybie podglądu nadal może otwierać drawer (bo nie kupuje — używa CMS-a).
- Reguła: jeden zalogowany użytkownik = jeden bilet na dane wydarzenie, niezależnie od metody płatności (PayU / przelew / darmowe) i statusu (`pending` / `paid` / `awaiting_transfer`). Statusy `cancelled/refunded/failed/expired` nie blokują (te nie liczą się jako aktywna rezerwacja).
- Sprawdzenie obejmuje również sytuację, gdy użytkownik figuruje jako uczestnik (attendee) w cudzym zamówieniu grupowym oraz potwierdzone zgłoszenia z `event_form_submissions`.

## Weryfikacja

1. Józef Pyza (z aktywnym biletem `pending`) klika „Rezerwuję" → drawer się nie otwiera, pojawia się toast „Masz już rezerwację…".
2. Inny użytkownik bez biletu klika „Rezerwuję" → drawer otwiera się normalnie.
3. Po anulowaniu biletu (status `cancelled`) ten sam użytkownik może zarezerwować ponownie.
4. Admin w trybie podglądu nadal może otworzyć formularz.
