# Plan — „jedna rezerwacja na wydarzenie" + zapraszanie gości tylko przez link

## Zasada
Każdy zalogowany użytkownik (klient, partner, specjalista, lider, gość PLC) może mieć tylko jedną aktywną rezerwację na dane wydarzenie. Tylko admin omija blokadę. Dopisywanie gości w formularzu zakupu jest niedostępne. Goście rejestrują się wyłącznie przez osobny link zapraszający, i tylko gdy admin włączy tę opcję na wydarzeniu.

## Zaimplementowane
- Migracja: `paid_events.allow_attendee_invites BOOLEAN NOT NULL DEFAULT false`.
- Admin (EventMainSettingsPanel): toggle „Pozwól uczestnikom zapraszać dodatkowych gości (przez link zapraszający)".
- `useHasOwnEventTicket` jako jedyne źródło prawdy (orders + attendees + form_submissions, `account_deleted_at IS NULL`).
- `PaidEventPage.handlePurchase` blokuje otwarcie drawera dla użytkownika z rezerwacją (poza adminem).
- `PaidEventSidebar`: panel „Masz już rezerwację" + opcjonalny panel „Zaproś gościa" z linkiem zapraszającym (Kopiuj / Wyślij — Web Share API).
- `PurchaseDrawer`:
  - logged-in non-admin → quantity zablokowane na 1 (brak pola „dorzuć gościa" w domyślnej rezerwacji 1-osobowej),
  - hasOwnTicket → wyłącznie komunikat + (opcjonalnie) panel „Zaproś gościa" + przycisk zamknij,
  - admin nadal ma pełne flow.
- Backend (`create-event-order`, `register-event-transfer-order`, `register-free-event-order`): twardy guard po `user_id` ORAZ e-mailu z `account_deleted_at IS NULL`.
- Komunikaty spójne dla wszystkich ról.

## Efekt
Klient/Partner/Specjalista/Gość PLC nie zarezerwuje drugiego biletu i nie widzi pól dopisywania gości. Dodatkowi goście trafiają na wydarzenie tylko przez link zapraszający — i tylko gdy admin to włączy.
