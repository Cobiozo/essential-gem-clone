## Cel

1. Po wykonaniu check-in na liście uczestników pozycja danej osoby ma świecić się na zielono z etykietą „Check-in wykonano" oraz przyciskiem **Check-out**, który cofa check-in.
2. Skanowanie/wpisywanie kodu biletu zawsze (niezależnie od statusu) ma pokazywać „Bilet prawidłowy" z danymi uczestnika oraz – jeśli check-in już był wykonany – informacją „Check-in wykonano: DD.MM.YYYY HH:mm".

## Zmiany w backendzie

**`supabase/functions/verify-event-ticket/index.ts`**

- Już zameldowany bilet nie jest dłużej traktowany jako błąd. Zamiast zwracać `valid:false / ALREADY_CHECKED_IN`, funkcja zwraca `valid:true` z polami `checkedIn:true` i `checkedInAt` (ISO). Klient pokazuje zielony status z datą i godziną.
- Dodanie nowej akcji `action: 'check_out'` (obok obecnego `markAsCheckedIn`). Tylko admin. Ustawia `checked_in=false`, `checked_in_at=null` na poziomie `paid_event_order_attendees` (jeśli istnieje) lub `paid_event_orders`.
- Zachowanie pozostałych ścieżek (NOT_FOUND, NOT_PAID, TOO_EARLY dla nie-adminów przy markAsCheckedIn) bez zmian.

## Zmiany w UI

**`src/components/admin/paid-events/TicketVerification.tsx`**

1. **Panel wyniku skanowania:**
   - Gdy `checked_in === true`: zielony nagłówek „Bilet prawidłowy" + badge „Check-in wykonano: dd.MM.yyyy HH:mm" (pełna data, nie tylko godzina). Pod spodem przycisk „Cofnij check-in" wywołujący nową akcję `check_out`.
   - Gdy `checked_in === false`: bez zmian – pokazuje „Wykonaj check-in".
   - Dane uczestnika (imię, email, kod, event) pokazywane zawsze.

2. **Lista uczestników:**
   - Wiersz osoby z `checked_in=true`: zielone tło (już jest), zielony badge „Check-in: dd.MM HH:mm" zamiast pustego przycisku, oraz przycisk **Check-out** (variant outline, ikona `RotateCcw`/`XCircle`) wywołujący akcję cofnięcia.
   - Wiersz osoby bez check-in: bez zmian – przycisk „Check-in".

3. Nowa funkcja `handleRowCheckOut(code)` oraz `handleCheckOut()` w panelu wyniku – wysyłają request z `action:'check_out'` do edge function, po sukcesie odświeżają listę i ustawiają wynik z `checked_in:false`.

4. Aktualizacja `VerificationResult` o pole `checked_in_at` z odpowiedzi serwera (zamiast generowania `new Date().toISOString()` lokalnie) tak aby pokazywany czas check-in odpowiadał rzeczywistemu zapisowi w bazie.

## Szczegóły techniczne

- Format daty w UI: `dd.MM.yyyy HH:mm` (date-fns + locale `pl`) w wyniku skanowania; `dd.MM HH:mm` w wierszu listy (oszczędność miejsca).
- `check_out` zwraca taką samą strukturę co `verify` (valid:true, checkedIn:false), żeby UI mógł od razu zaktualizować widok.
- Optimistic update listy w `setOrders` przy check-out (analogicznie jak przy check-in).
- Toast: „Cofnięto check-in" przy sukcesie check-out, „Błąd" przy niepowodzeniu.
- Brak zmian w bazie danych ani innych edge functions.
