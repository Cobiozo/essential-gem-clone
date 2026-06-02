## Cel

1. Sprzedaż więcej niż 1 biletu staje się **opcją włączaną przez admina per bilet**. Domyślnie wyłączone — kupujący może wziąć tylko 1 bilet.
2. Gdy wielokrotny zakup jest włączony i kupujący dodaje kolejne bilety, **dane każdego dodatkowego uczestnika (imię, nazwisko, email) są obowiązkowe** — nie „opcjonalne" jak teraz.

## Zmiany

### 1. Baza danych — `paid_event_tickets`
Dodać kolumnę `allow_multiple_purchase boolean NOT NULL DEFAULT false`.

### 2. Panel admina — `EventTicketsPanel.tsx`
W sekcji edycji biletu, obok pola „Osób na 1 bilet", dodać przełącznik (`Switch`):
- Label: „Zezwól na zakup więcej niż 1 sztuki"
- Pomocniczy opis: „Gdy włączone, kupujący może w jednym zamówieniu zarezerwować kilka biletów (każdy z osobnymi danymi uczestnika)."
- Mapowanie do `allow_multiple_purchase`.

### 3. Mapowanie do publicznej strony — `PaidEventPage.tsx`
W mapie tickets ustawić `max_per_order = allow_multiple_purchase ? (quantity_available ?? null) : 1`.
W typie `TicketInfo` (PurchaseDrawer) i `available_quantity` przekazać też nowy efektywny limit.

### 4. Drawer zakupu — `PurchaseDrawer.tsx`
- `TicketInfo` dostaje `max_per_order?: number | null`.
- `maxQty` liczy się jako `min(MAX_TICKETS, available_quantity, max_per_order || 1)`. Gdy `max_per_order === 1`, selektor ilości jest ukryty (zamiast „Liczba biletów" pokazujemy tylko podsumowanie z 1 szt.).
- Dla każdego dodatkowego uczestnika (`attendees[idx]`):
  - inputy `firstName`, `lastName`, `email` oznaczone gwiazdką (`*`), z `required`.
  - usunąć etykietę „opcjonalnie" — zastąpić „wymagane".
  - placeholder e-maila bez „(opcjonalnie)".
- `validate()`:
  - Zamiast sprawdzać tylko imię i nazwisko, sprawdzać też email (`a.email.trim()` + prosty regex `^\S+@\S+\.\S+$`).
  - Komunikat: „Uzupełnij imię, nazwisko i email dla uczestnika N".
- `buildPayload()`: email gościa wysyłany zawsze (nie `|| null`).

### 5. Edge function `create-event-order` (opcjonalna walidacja serwerowa)
Dodać walidację: jeśli `quantity > 1`, każdy `attendees[i]` musi mieć `firstName`, `lastName`, `email`. W przeciwnym razie zwrócić 400 z komunikatem „Brak wymaganych danych uczestnika #i".

## Co bez zmian
- Logika „guest-only" (gdy zalogowany już ma bilet) działa po staremu — tam wszystkie miejsca są dla gości i tak będą wymagać kompletu danych.
- Cena, podsumowanie, płatność, formularze gościa (gdy bilet kupowany jest dla zalogowanego z `seats_per_ticket > 1`) — bez zmian poza wymogiem pełnych danych.
- Brak zmian w widoku partnera/gościa w podglądzie admina.

## Pliki do edycji
- migracja SQL (`paid_event_tickets.allow_multiple_purchase`)
- `src/components/admin/paid-events/editor/EventTicketsPanel.tsx`
- `src/pages/PaidEventPage.tsx`
- `src/components/paid-events/public/PurchaseDrawer.tsx`
- `supabase/functions/create-event-order/index.ts`
