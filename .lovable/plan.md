## Problem

Na liście `/paid-events` pod kartą wydarzenia użytkownik nie widzi swoich własnych zakupionych biletów ani uczestników (siebie + gości). Sekcja „Pokaż zapisanych" jest dziś dostępna tylko:

- dla **partnerów/adminów** (warunek `isPartner || isAdmin`),
- gdy `subs > 0` — czyli tylko jeśli ktoś zapisał się przez link partnerski.

Dlatego nawet po zakupie 2 biletów użytkownik nic nie widzi pod wydarzeniem (chociaż dane są w bazie — sprawdzone: order `44a9a841…` ma quantity=2, total=70 zł, 2 attendees).

Dodatkowo komponent `MyEventFormReferrals` używa zapytania `myOrders` tylko gdy dostanie `eventId` — w obecnym wywołaniu (`formId={form.id}`) ta sekcja nie ładuje zamówień.

## Cel

Pod kartą każdego wydarzenia na `/paid-events` ma się pojawić sekcja „Twoje bilety na to wydarzenie" — widoczna dla każdego zalogowanego użytkownika, który ma zakupione bilety na to wydarzenie. Ma pokazywać:

- liczbę biletów i kwotę zamówienia + status (Opłacone / Oczekuje płatności),
- listę uczestników (`seat_index`, imię, nazwisko),
- dla siedzenia kupującego — badge **„Ty"**,
- dla pustych miejsc gości — etykietę **„Gość — uzupełnij dane"**,
- przycisk **Edytuj** dla miejsc innych niż kupującego.

## Zmiany

### 1) Nowy komponent: `MyEventTicketsInline` (kompaktowy widok)

`src/components/paid-events/MyEventTicketsInline.tsx`

- Props: `{ eventId: string }`.
- Pobiera `paid_event_orders` użytkownika dla danego eventu (z `paid_event_tickets` i `paid_event_order_attendees`).
- Jeśli brak zamówień → nic nie renderuje (`return null`).
- Renderuje kompaktową kartę z listą zamówień/uczestników (dziedziczy logikę „Ty" / „Gość — uzupełnij dane" oraz dialog edycji uczestnika z `MyTicketOrders`).
- Refaktor: wydzielić wspólną logikę listy uczestników i edycji do hooka/utilsa, żeby `MyTicketOrders` i `MyEventTicketsInline` współdzieliły kod (jedno źródło prawdy).

### 2) Wpięcie w `PaidEventCard.tsx`

- W `PaidEventCard` po sekcji partnerskiej (lub niezależnie od niej) dodać:
  ```tsx
  {!isPast && user && (
    <div onClick={(e) => e.stopPropagation()} className="border-t bg-muted/20 px-4 py-3">
      <MyEventTicketsInline eventId={event.id} />
    </div>
  )}
  ```
- Komponent sam zdecyduje czy się renderować (gdy są zamówienia).
- Dodać `useAuth()` do `PaidEventCard`.

### 3) Dodatkowa poprawka w panelu partnera

W `MyEventFormLinks.tsx` (sekcja „Pokaż zapisanych"):
- Przekazać `eventId={form.event_id}` do `MyEventFormReferrals`, żeby blok „Twoje zakupione bilety" działał także w widoku partnera.
- Zmienić warunek otwierania kolapsu, żeby był dostępny także gdy partner ma własne zamówienia (nie tylko gdy `subs > 0`).

### 4) Sekcja „Moje bilety" na górze listy

Pozostaje bez zmian (`MyTicketOrders` na `/paid-events`). Nowy widok pod kartą wydarzenia jest komplementarny — kontekstowy obok danego eventu.

## Pliki

- `src/components/paid-events/MyEventTicketsInline.tsx` *(nowy)*
- `src/components/paid-events/PaidEventCard.tsx` *(edycja)*
- `src/components/paid-events/MyEventFormLinks.tsx` *(edycja — warunek + props)*
- (opcjonalnie) wspólny hook `useMyEventOrders(eventId?)` aby uniknąć duplikacji zapytań.

## Bez zmian backendowych

Dane są poprawne w bazie, RLS już pozwala czytać własne zamówienia. To wyłącznie zmiana frontowa, żeby pokazać już istniejące dane w odpowiednim miejscu.
