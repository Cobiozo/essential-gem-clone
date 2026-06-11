---
name: Event one-reservation-per-user
description: Globalna zasada „jedna rezerwacja na wydarzenie" + zapraszanie gości tylko przez link zapraszający (flaga admina paid_events.allow_attendee_invites)
type: feature
---

# Reguły
- Każdy zalogowany użytkownik (klient, partner, specjalista, lider, gość PLC) może mieć tylko JEDNĄ aktywną rezerwację na dane wydarzenie. Tylko `isAdmin` omija blokadę.
- W formularzu zakupu (`PurchaseDrawer`) zalogowany non-admin ma quantity zablokowane na 1 — brak pól „dorzuć gościa".
- Po wykupieniu/zarezerwowaniu (`useHasOwnEventTicket = true`) — drawer pokazuje wyłącznie komunikat „Masz już rezerwację" + zamknij.
- Gdy admin włączy `paid_events.allow_attendee_invites = true`, użytkownik z aktywną rezerwacją widzi dodatkowo panel „Zaproś gościa" z linkiem (sidebar + drawer). Domyślny link: `/event-form/{slug}` jeśli istnieje formularz rejestracji, w przeciwnym razie URL strony wydarzenia.
- Goście rejestrują się samodzielnie przez ten link — każdy gość przechodzi pełną walidację „jedna rezerwacja na osobę".

# Backend (twardy guard, niezależny od roli, admin pomijany)
Edge functions `create-event-order`, `register-event-transfer-order`, `register-free-event-order`, oraz RPC `submit_event_form`:
- sprawdzają duplikaty po `user_id` ORAZ e-mailu w `paid_event_orders`, `paid_event_order_attendees`, `event_form_submissions`,
- ZAWSZE filtrują `account_deleted_at IS NULL` — recyklowany e-mail nie dziedziczy historii usuniętego konta,
- zwracają `already_registered` z komunikatem „Masz już rezerwację na to wydarzenie. Każdy użytkownik może zarezerwować bilet tylko raz."

# Komponenty
- `useHasOwnEventTicket(eventId)` — jedyne źródło prawdy w UI.
- `PaidEventSidebar` props: `alreadyRegistered`, `allowAttendeeInvites`, `inviteUrl`.
- `PurchaseDrawer` props: `allowAttendeeInvites`, `inviteUrl`; wewnętrzny `singleSeatLock = user && !isAdmin`.
- Admin toggle: `EventMainSettingsPanel` → pole `allow_attendee_invites`.
