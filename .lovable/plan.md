## Problem
Na liście „zapisanych przez mój link" gość z darmowym wydarzeniem widzi status **„Oczekuje płatności"**, mimo że bilet jest bezpłatny. Powinno być:
- przed potwierdzeniem maila → **„Oczekuje potwierdzenia adresu e-mail"** (żółty)
- po potwierdzeniu maila → **„Potwierdzony"** (zielony)

Dla wydarzeń płatnych logika `payment_status` zostaje bez zmian.

## Zmiany

### `src/components/paid-events/MyEventFormReferrals.tsx`
1. Rozszerzyć `select` o join z wydarzeniem, żeby pobrać `is_free`:
   - `paid_events!event_form_submissions_event_id_fkey ( is_free )`
   - (alternatywnie pobrać oddzielnie listę event_id → is_free; jedno zapytanie na karcie wystarczy)
2. Dodać helper `isFreeForRow(row)` — `true`, gdy `row.paid_events?.is_free === true`.
3. Zmienić logikę renderowania ostatniej kolumny:
   - jeśli `status === 'cancelled'` → `Anulowane` (bez zmian)
   - jeśli wydarzenie darmowe:
     - `email_confirmed_at` ustawione → zielony badge **„Potwierdzony"**
     - w przeciwnym razie → żółty badge **„Oczekuje potwierdzenia adresu e-mail"**
     - kolumna „Email potw." pozostaje (informacja zduplikowana, ale spójna z resztą tabeli)
   - jeśli wydarzenie płatne → istniejąca logika `paymentBadge(payment_status, status)`.

Żadnych zmian w bazie ani RPC — pole `is_free` już istnieje w `paid_events` i jest publicznie odczytywalne.

### Panel admina (opcjonalnie, dla spójności)
`src/components/admin/GuestRegistrationsPanel.tsx` aktualnie pokazuje surowe `payment_status`. Jeśli chcesz, zastosuję tę samą logikę (darmowe → „Oczekuje potwierdzenia e-mail" / „Potwierdzony"). Potwierdź, czy uwzględnić również ten panel — w przeciwnym razie zmienię tylko widok użytkownika (gościa/partnera).

## Zakres techniczny
- Brak migracji.
- Brak zmian RLS.
- Pojedynczy plik frontendowy (+ ewentualnie panel admina).