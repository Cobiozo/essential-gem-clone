

# Auto-webinar: każdy slot = osobna rejestracja + zawsze nowy kontakt

## Problem
Obecna logika traktuje auto-webinar jak zwykłe wydarzenie: ten sam email na to samo event_id = "already_registered". Kontakt w CRM jest tworzony raz (deduplikacja po email+phone). Użytkownik chce, żeby każda godzina (slot) była osobnym wpisem rejestracyjnym, a w kontaktach partnera zawsze pojawiał się nowy rekord z adnotacją "Kontakt z autowebinar z dnia DD.MM.YYYY, godz. HH:MM".

## Rozwiązanie

### 1. Baza danych — migracja

**a) Nowa kolumna `slot_time` w `guest_event_registrations`:**
```sql
ALTER TABLE guest_event_registrations 
ADD COLUMN IF NOT EXISTS slot_time TEXT DEFAULT NULL;
```

**b) Zmiana unique index** — dla auto-webinarów unikalność to event_id + email + slot_time:
```sql
DROP INDEX IF EXISTS unique_guest_per_event;
CREATE UNIQUE INDEX unique_guest_per_event 
ON guest_event_registrations (event_id, email, COALESCE(slot_time, ''))
WHERE status != 'cancelled';
```

**c) Aktualizacja RPC `register_event_guest`** — dodanie parametru `p_slot_time TEXT DEFAULT NULL`:
- INSERT uwzględnia `slot_time`
- EXCEPTION handler aktualizuje rekord z pasującym `slot_time`
- Dzięki temu ten sam email może się rejestrować na różne sloty tego samego auto-webinaru

### 2. Frontend — `EventGuestRegistration.tsx`

- Przy submit dla auto-webinarów: przekazywać do RPC `p_slot_time` = czas slotu (np. "14:00") wyliczony z `getNextSlot()`
- Nie blokować ekranu "already_registered" — dla auto-webinarów RPC zwróci `already_registered` tylko jeśli ten sam email jest na ten sam slot

### 3. Edge Function — `send-webinar-confirmation`

**Kluczowa zmiana w logice kontaktów:**
- Dla auto-webinarów (`isAutoWebinar = true`): **zawsze tworzyć nowy kontakt** w `team_contacts`, bez sprawdzania duplikatów email+phone
- `contact_source` = `"Auto-webinar z dnia DD.MM.YYYY, godz. HH:MM"`
- `notes` = `"Kontakt z autowebinar"`
- Powiązanie nowego kontaktu z rejestracją (`team_contact_id`)

Dla zwykłych webinarów — zachować obecną logikę deduplikacji.

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| Migracja SQL | Kolumna `slot_time`, nowy unique index, aktualizacja RPC |
| `src/pages/EventGuestRegistration.tsx` | Przekazywanie `slot_time` do RPC |
| `supabase/functions/send-webinar-confirmation/index.ts` | Dla auto-webinar: zawsze nowy kontakt z adnotacją daty/godz |

