

# Plan: Selektor godziny przypomnienia w kontaktach prywatnych

## Koncepcja

Zamiast sztywnego okna 10:00-15:00 CET, partner sam wybiera datę **i godzinę** przypomnienia. Edge function przetwarza przypomnienia gdy `reminder_date <= NOW()` -- bez ograniczenia godzinowego. Cron i tak odpala się co godzinę, więc przypomnienie przyjdzie z dokładnością do ~1h od wybranej godziny.

## Zmiany

### 1. Formularz (`PrivateContactForm.tsx`)
- Zamienić `<Input type="date">` dla `reminder_date` na dwa pola obok siebie: `<Input type="date">` + `<Input type="time">` (np. `09:00`, `14:30`)
- Przy zapisie łączyć datę i godzinę w pełny timestamp z timezone Warsaw: `2026-03-05T14:30:00+01:00`
- Przy edycji parsować istniejący `reminder_date` z powrotem na osobne pola daty i czasu
- Domyślna godzina: `10:00` (jeśli partner nie wybierze)

### 2. Edge function (`process-pending-notifications/index.ts`)
- **Usunąć** warunek okna 10:00-15:00 CET (linie 983-989)
- Zostawić istniejącą logikę `reminder_date <= NOW()` -- to wystarczy, bo teraz `reminder_date` zawiera konkretną godzinę ustawioną przez partnera

### 3. Brak zmian w bazie danych
- Kolumna `reminder_date` jest typu `timestamptz` -- już obsługuje datę z godziną. Zmiana dotyczy tylko tego, że formularz będzie zapisywał pełny timestamp zamiast samej daty.

## Pliki do zmiany
- `src/components/team-contacts/PrivateContactForm.tsx` -- dodanie pola godziny, łączenie daty+czasu przy zapisie
- `supabase/functions/process-pending-notifications/index.ts` -- usunięcie warunku 10-15 CET

