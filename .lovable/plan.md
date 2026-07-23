## Cel
1. W panelu admina (lista wydarzeń płatnych) w kolumnie „Bilety" pokazać realną liczbę zarejestrowanych osób z podziałem: Goście / Goście PLC / Partnerzy.
2. Na publicznej stronie wydarzenia licznik „Dostępnych miejsc" ma być realny — `max_tickets − (goście + goście PLC + partnerzy)`.

## Jak rozróżniamy typy rejestracji
Na podstawie istniejącego schematu (bez zmian w bazie):
- **Partner (zalogowany)** — rekord w `paid_event_orders` z `user_id IS NOT NULL`, gdzie profil ma rolę `partner`/`specjalista`.
- **Gość PLC (zalogowany klient PLC)** — rekord w `paid_event_orders` z `user_id IS NOT NULL`, gdzie profil ma rolę `client` (Klient PLC).
- **Gość (niezalogowany)** — rekordy z `guest_event_registrations` + `event_form_submissions` + `paid_event_orders` z `user_id IS NULL`.

Liczymy „miejsca" tak jak dziś (attendees / fallback quantity dla zamówień bez attendees + submissions + guest_event_registrations), ale grupujemy po źródle.

## Zmiany w kodzie (tylko frontend)

### 1) `src/pages/PaidEventPage.tsx`
Rozbudować query `paid-event-occupied-seats`:
- Dociągnąć `user_id` w `paid_event_orders` i policzyć role zamawiających jednym zapytaniem do `user_roles` (batch po `user_id`).
- Zwracać obiekt `{ total, guests, guestsPlc, partners }` zamiast pojedynczej liczby.
- `total` używamy dalej do `availableSpots`.

### 2) `src/components/paid-events/public/PaidEventSidebar.tsx`
Pod linijką „Dostępnych miejsc: X" dodać drobny rozbicie: `Goście: A · PLC: B · Partnerzy: C` (widoczne tylko gdy `max_tickets` ustawione). Reszta logiki (Ostatnie miejsca / Brak miejsc) bez zmian — nadal na bazie `availableSpots`.

### 3) `src/components/admin/paid-events/PaidEventsList.tsx`
- Nowy hook / query `usePaidEventStats(eventIds[])` (jedno wywołanie dla wszystkich wydarzeń na liście) zwracający mapę `eventId → { guests, guestsPlc, partners, total }` używając tej samej logiki co w (1).
- Kolumna „Bilety": zamiast `tickets_sold/max_tickets` wyświetlać:
  ```
   12 / 155
   Goście 5 · PLC 3 · Partnerzy 4
  ```
  (małe muted subline). Przy braku `max_tickets` — sam podział bez `/max`.
- Kolor `text-destructive` gdy `total >= max_tickets`.

### 4) Cache / realtime
Query keye zawierają `event.id`; `staleTime: 20s` jak dziś. Bez realtime subskrypcji.

## Poza zakresem
- Brak migracji DB, brak zmian w edge functions.
- Brak nowych filtrów/eksportów — tylko wyświetlanie liczników.

## Weryfikacja
Otworzyć `/admin` → Płatne wydarzenia → sprawdzić kolumnę „Bilety" dla wydarzenia z mieszanymi rejestracjami. Otworzyć publiczną stronę `/events/{slug}` → potwierdzić że „Dostępnych miejsc" = `max_tickets − total` i widać rozbicie.
