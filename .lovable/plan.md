
# Plan: Naprawienie blokady rejestracji na inny termin (ta sama godzina, inny dzień)

## Problem

`slot_time` w tabeli `guest_event_registrations` przechowuje tylko `HH:MM` (np. `23:00`). Unique constraint `(event_id, email, COALESCE(slot_time, ''))` sprawdza unikalność bez daty. Efekt: rejestracja z 27 marca na 23:00 blokuje rejestrację z 8 kwietnia na 23:00 — mimo że to inny dzień.

## Rozwiązanie

Zmienić `slot_time` na format `YYYY-MM-DD_HH:MM` (np. `2026-04-08_23:00`) — ten format jest już używany w URL-ach (`?slot=2026-04-08_23:00`). Dzięki temu unique constraint poprawnie odróżni sloty na różne daty.

## Zmiany

### 1. Migracja SQL — aktualizacja unique constraint

```sql
-- Drop old constraint
DROP INDEX IF EXISTS unique_guest_per_event;

-- Recreate with same logic — slot_time will now contain date
CREATE UNIQUE INDEX unique_guest_per_event 
ON guest_event_registrations (event_id, email, COALESCE(slot_time, ''))
WHERE status <> 'cancelled';
```

Constraint pozostaje ten sam — zmiana jest w formacie danych, nie w indeksie.

### 2. `EventGuestRegistration.tsx` — zmiana `slotTimeValue`

Zmienić z `resolvedSlot.time` (`HH:MM`) na pełny format z datą:

```typescript
const slotTimeValue = isAutoWebinar && resolvedSlot
  ? `${format(resolvedSlot.date, 'yyyy-MM-dd')}_${resolvedSlot.time}`
  : null;
```

### 3. Migracja istniejących danych (opcjonalna)

Stare rekordy mają `slot_time = '23:00'` bez daty. Nie powoduje to problemów — nowe rekordy będą miały format `2026-04-08_23:00`, więc nie będą kolidować ze starymi. Stare dane nie muszą być migrowane.

### 4. Weryfikacja — inne miejsca używające `slot_time`

Sprawdzić i ewentualnie dostosować kod, który porównuje `slot_time` (np. w powiadomieniach, statystykach), żeby obsługiwał oba formaty.

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/pages/EventGuestRegistration.tsx` | `slotTimeValue` z `HH:MM` na `YYYY-MM-DD_HH:MM` |
| Weryfikacja użyć `slot_time` w pozostałych plikach | Upewnienie się, że nowy format nie łamie istniejących funkcji |

## Efekt

- Gość zarejestrowany na 22:00 (8 kwietnia) może się zarejestrować na 23:00 (8 kwietnia) — inny slot
- Gość zarejestrowany na 23:00 (27 marca) może się zarejestrować na 23:00 (8 kwietnia) — inny dzień
- Gość NIE może się zarejestrować drugi raz na ten sam slot tego samego dnia
