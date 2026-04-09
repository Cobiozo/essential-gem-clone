

# Diagnoza: Dlaczego wszystkie zapisy na Sales Mastery są "Anulowane"

## Problem

Rejestracje **nie są anulowane** — mają status `completed` w bazie danych. Wszystkie 41 zapisów zostało automatycznie oznaczonych jako `completed` przez CRON (`process-pending-notifications`) po zakończeniu wydarzenia (09.04.2026 19:00 UTC).

**Bug jest w UI**, nie w danych. Panel administracyjny (`EventRegistrationsManagement.tsx`) stosuje binarną logikę:

```text
status === 'registered' ? 'Zapisany' : 'Anulowany'
```

Czyli wszystko co nie jest `registered` (w tym `completed`, `attended`) wyświetla się jako "Anulowany" z czerwonym badge'm.

## Rozwiązanie

Dodać obsługę statusu `completed` w UI panelu zarządzania rejestracjami:

### Zmiany w `EventRegistrationsManagement.tsx`

1. **Badge statusu** — dodać case `completed` z zielono-szarym badge'm "Zakończony" (lub "Uczestniczył") obok istniejących `registered` i `cancelled`
2. **Eksport CSV** (linia 418) — mapowanie `completed` → "Zakończony" zamiast "Anulowany"
3. **Statystyki** (linia 337-341) — liczyć `completed` jako "Aktywnych" (lub osobna kategoria "Zakończonych"), nie jako "Anulowanych"
4. **Filtr statusu** — dodać opcję "Zakończony" do SelectItem (linia 1556-1558)
5. **Lista "Email po webinarze"** — upewnić się, że `completed` jest uwzględniony w liście odbiorców follow-up (linie 578-602)

### Zmiany w `EventRegistrationReport.tsx`

Analogiczna poprawka w raporcie (linia 209): `completed` → "Zakończony"

**Dane w bazie są poprawne — żadna migracja SQL nie jest potrzebna.**

