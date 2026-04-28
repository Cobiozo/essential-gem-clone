## Problem

Przełącznik `show_last_spots_label` został dodany tylko do nowego edytora split-view (`EventMainSettingsPanel.tsx`), ale w panelu admina lista wydarzeń płatnych otwiera **stary dialog** "Edytuj wydarzenie" z `src/components/admin/paid-events/PaidEventsList.tsx` — tam toggla brakuje, dlatego nie widać go po kliknięciu "Edytuj".

## Zmiany

**Plik:** `src/components/admin/paid-events/PaidEventsList.tsx`

1. W sekcji "Limit biletów" (ok. linia 428–441) — bezpośrednio pod inputem `max_tickets` dodać Switch:
   - `id="show_last_spots_label"`
   - Etykieta: **"Pokazuj 'Ostatnie wolne miejsca' zamiast licznika"**
   - Krótki opis pomocniczy pod spodem (muted-text)
   - `checked={formData.show_last_spots_label || false}`
   - `onCheckedChange` aktualizuje `formData.show_last_spots_label`

2. Upewnić się, że `formData` (typ/initial state w tym pliku) zawiera pole `show_last_spots_label: boolean` oraz że jest ono zapisywane do `paid_events` w handlerze submit (zazwyczaj cały `formData` jest spreadowany do upsertu — sprawdzić i, jeśli trzeba, dodać pole jawnie).

3. Przy edycji istniejącego wydarzenia załadować wartość z rekordu (`show_last_spots_label: event.show_last_spots_label ?? false`).

Brak migracji DB — kolumna już istnieje. Brak innych zmian; logika frontu publicznego (`PaidEventSidebar`, `PaidEventPage`) już obsługuje flagę.

## Test

Po zmianie: w `/admin?tab=paid-events` → "Edytuj" przy wydarzeniu → pod "Limit biletów" pojawi się Switch. Włączenie i zapis → na stronie publicznej zamiast licznika wolnych miejsc pokaże się czerwony napis "OSTATNIE WOLNE MIEJSCA!".