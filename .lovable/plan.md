

# Fix: Ponowna rejestracja gości + wyświetlanie dat rejestracji w widoku wydarzeń

## Problem 1: Goście nie mogą się ponownie zarejestrować po usunięciu kontaktu

**Root cause:** Tabela `guest_event_registrations` ma UNIQUE INDEX `unique_guest_per_event` na `(event_id, email)` — obejmuje WSZYSTKIE statusy. Po usunięciu kontaktu, rejestracja zmienia status na `cancelled`, ale wiersz nadal istnieje. Formularz rejestracji (anon user) nie może:
- SELECT → RLS blokuje anon (brak polityki)
- UPDATE → RLS blokuje anon
- INSERT → unique constraint 23505 → "Już zarejestrowany"

**Fix:** Zamienić unique index na partial (tylko `status != 'cancelled'`). Dzięki temu ponowna rejestracja tworzy nowy wiersz, a anulowane rekordy pozostają jako historia prób.

```sql
DROP INDEX unique_guest_per_event;
CREATE UNIQUE INDEX unique_guest_per_event ON guest_event_registrations (event_id, email) WHERE status != 'cancelled';
```

Dodatkowo zaktualizować `EventGuestRegistration.tsx` — nie szukać cancelled do reaktywacji (bo anon i tak nie może), po prostu INSERT (partial index to umożliwi).

## Problem 2: Brak dat rejestracji i badge'ów w widoku "Z zaproszeń na wydarzenia"

Komponent `EventGroupedContacts.tsx` nie otrzymuje `eventContactDetails` i nie wyświetla:
- Daty/godziny rejestracji
- Badge "🔄 Ponowna próba ×N"

**Fix:** Przekazać `eventContactDetails` do `EventGroupedContacts` i wyświetlać te dane przy każdym kontakcie.

## Problem 3: Liczenie prób rejestracji

Po zmianie unique index, wiele wierszy na ten sam email+event będzie istnieć. Hook `useTeamContacts.ts` już liczy `attemptCounter` po email+event, więc to zadziała automatycznie z wieloma wierszami.

## Zmiany w plikach

| Plik | Zmiana |
|------|--------|
| **SQL migration** | Drop + recreate partial unique index |
| `src/pages/EventGuestRegistration.tsx` | Usunąć logikę reactivation cancelled (anon nie ma dostępu), po prostu INSERT — partial index pozwoli |
| `src/components/team-contacts/EventGroupedContacts.tsx` | Dodać prop `eventContactDetails`, wyświetlać datę rejestracji i badge prób |
| `src/components/team-contacts/TeamContactsTab.tsx` | Przekazać `eventContactDetails` do `EventGroupedContacts` |

