

# Wybór grupy odbiorców + konkretna osoba w dialogu follow-up

## Zmiany

### 1. UI dialogu (`EventRegistrationsManagement.tsx`)

Dodanie sekcji wyboru odbiorców między info-barem a polem wiadomości:

**a) Radio group / Select z 4 opcjami:**
- `all` — Wszyscy (użytkownicy + goście) — domyślne
- `users` — Tylko użytkownicy platformy
- `guests` — Tylko goście
- `single` — Konkretna osoba

**b) Tryb "Konkretna osoba":**
- Gdy wybrano `single`, pojawia się Select/Combobox z listą wszystkich uczestników (użytkownicy + goście) danego wydarzenia
- Każdy wpis: `Imię Nazwisko (email)` z badge `Użytkownik`/`Gość`
- Lista budowana z istniejących `registrations` + `guestRegistrations` (dane już pobrane)

**c) Dynamiczne przeliczenie odbiorców:**
- `all` → count unikalnych emaili (jak teraz)
- `users` → count aktywnych użytkowników
- `guests` → count aktywnych gości
- `single` → 1

**Nowe stany:**
- `followUpRecipientGroup: 'all' | 'users' | 'guests' | 'single'`
- `followUpSingleRecipient: { email: string; firstName: string; type: 'user' | 'guest' } | null`

### 2. Edge Function (`send-post-webinar-email/index.ts`)

Dodanie parametru `recipient_group` i `single_recipient`:
- `recipient_group: 'all' | 'users' | 'guests' | 'single'`
- `single_recipient?: { email: string; first_name: string }` — używane gdy group = 'single'
- Filtrowanie: `users` → tylko `event_registrations`, `guests` → tylko `guest_event_registrations`, `single` → pomija query, używa podanego emaila

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/admin/EventRegistrationsManagement.tsx` | Radio group odbiorców, combobox konkretnej osoby, dynamiczny count, przekazanie parametrów |
| `supabase/functions/send-post-webinar-email/index.ts` | Obsługa `recipient_group` i `single_recipient` |

