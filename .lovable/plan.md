

# Poprawka: brakujące kolumny w tabeli profiles

## Problem

Funkcja `admin_toggle_user_status` (oraz `process-pending-notifications`) odwołuje się do kolumn `blocked_at`, `block_reason` i `inactivity_warning_sent_at` w tabeli `profiles`, ale te kolumny **nie istnieją** w bazie danych. Stąd błąd "column 'blocked_at' does not exist" przy próbie zablokowania użytkownika.

## Rozwiązanie

Dodać brakujące kolumny do tabeli `profiles` poprzez migrację SQL:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS block_reason text,
  ADD COLUMN IF NOT EXISTS inactivity_warning_sent_at timestamptz;
```

### Plik do zmiany
| Element | Zmiana |
|---------|--------|
| Migracja SQL | Dodanie 3 brakujących kolumn do `profiles` |

Żadne zmiany w kodzie frontendu nie są potrzebne — funkcja RPC i istniejący kod są poprawne, brakuje tylko kolumn w bazie.

