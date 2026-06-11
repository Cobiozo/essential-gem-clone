## Zasada (globalna, niezależna od roli)

Każdy zalogowany użytkownik — klient, partner, specjalista, lider, gość PLC — może mieć tylko JEDNĄ aktywną rezerwację na dane wydarzenie. Tylko admin omija blokadę.

Druga próba (zapis, formularz publiczny, link reflinkowy, drawer zakupu) → komunikat „Masz już rezerwację na to wydarzenie. Każdy użytkownik może zarezerwować bilet tylko raz." + przycisk „Zobacz mój bilet".

## Plan

### 1. Frontend — wszystkie publiczne ścieżki rejestracji

Blokada bazuje wyłącznie na obecności aktywnej rezerwacji (`useHasOwnEventTicket`), nie patrzy na rolę. Admin pomijany jawnym warunkiem `isAdmin === true`.

- `PaidEventPage` + `PaidEventSidebar` + `PurchaseDrawer` — już objęte, potwierdzenie spójności dla każdej roli.
- `EventFormPublicPage` (`/event-form/:slug`) — dodać sprawdzenie dla zalogowanego: jeśli rezerwacja istnieje, zamiast formularza pokazać komunikat + link do „Moich biletów".
- `EventRegistrationBySlug` / `/events/register/:id` — to samo sprawdzenie dla zalogowanego użytkownika.

### 2. Backend — twarde guardy w edge functions

Sprawdzenie po `user_id` ORAZ po e-mailu, z `account_deleted_at IS NULL`, niezależnie od roli:

- `create-event-order` — potwierdzone.
- `register-event-transfer-order` — potwierdzone.
- `register-free-event-order` — potwierdzone.
- RPC `submit_event_form` (używana przez `EventFormPublicPage`) — dodać identyczny guard server-side, żeby zalogowany użytkownik nie utworzył drugiego `event_form_submissions`.

### 3. NOWE — Blokada „dopisywania gości" przez użytkownika z własną rezerwacją

Dziś `PurchaseDrawer` przy `quantity > 1` pozwala kupić bilet dla siebie + dorzucić gości. Po wprowadzeniu blokady „jedna rezerwacja na osobę":

- Jeżeli zalogowany użytkownik ma już aktywną rezerwację, drawer NIE pokazuje formularza ani opcji „dorzuć gościa".
- Możliwość zapraszania kolejnych gości przez istniejącego uczestnika istnieje WYŁĄCZNIE wtedy, gdy admin na poziomie wydarzenia/biletu jawnie włączy flagę „uczestnik może zapraszać gości" — wtedy działa wyłącznie przez osobny link zapraszający (reflink/partner link), nie przez ponowne otwarcie formularza zakupu.

#### Model danych
- Dodaję flagę `allow_attendee_invites BOOLEAN NOT NULL DEFAULT false` na `paid_events` (admin włącza per wydarzenie).
- UI admina (formularz wydarzenia): nowy toggle „Pozwól uczestnikom zapraszać dodatkowych gości (przez link zapraszający)".

#### Zachowanie w UI
- `PurchaseDrawer` + `PaidEventSidebar`: dla użytkownika z istniejącą rezerwacją:
  - jeśli `allow_attendee_invites = false` (domyślnie) → tylko komunikat „Masz już rezerwację", bez pól, bez selektora ilości,
  - jeśli `allow_attendee_invites = true` → komunikat „Masz już rezerwację" + dodatkowy panel „Zaproś gościa" z gotowym linkiem zapraszającym do skopiowania/wysłania (np. `/r/:slug?ref=<eq_id>` lub dedykowany link rejestracyjny). Brak możliwości dopisania gościa w bieżącym flow zakupu.
- Goście rejestrują się wówczas oddzielnie, każdy przez własny link — każdy z nich osobno przechodzi pełną walidację „jedna rezerwacja na osobę".

#### Backend
- `create-event-order` / `register-event-transfer-order` / `register-free-event-order`: jeśli wywołujący ma już aktywną rezerwację, odrzucają zamówienie nawet jeśli próbuje dorzucić innych uczestników. Wyjątek tylko dla admina.
- Nowy lub istniejący endpoint „rejestracja przez link zapraszający" pozostaje jedyną ścieżką dla dodatkowych gości i waliduje, że zapraszający faktycznie ma aktywną rezerwację oraz `allow_attendee_invites = true`.

### 4. Komunikaty (spójne, niezależne od roli)

- „Masz już rezerwację na to wydarzenie. Każdy użytkownik może zarezerwować bilet tylko raz."
- Dla wydarzeń z włączonym `allow_attendee_invites`: dodatkowo „Możesz zaprosić gości udostępniając poniższy link zapraszający."
- Dla wydarzeń bez tej flagi: bez sekcji zaproszeń.

### 5. Izolacja od kont usuniętych

Bez zmian — wszystkie zapytania filtrują `account_deleted_at IS NULL`, więc recyklowany e-mail nigdy nie dziedziczy historii usuniętego konta.

## Efekt

- Jedna rezerwacja na użytkownika na wydarzenie, dla każdej roli.
- Zalogowany uczestnik nie widzi już opcji „dorzuć gościa" w formularzu zakupu.
- Zapraszanie gości jest możliwe TYLKO, gdy admin to włączy, i TYLKO przez osobny link zapraszający — każdy gość przechodzi własną, samodzielną rejestrację objętą tą samą blokadą.
