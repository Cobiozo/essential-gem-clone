

## Plan: Reset rejestracji + twarde zabezpieczenie widżetu

### Co zrobimy

**Krok 1: Reset bazy danych**
- Migracja SQL: `UPDATE event_registrations SET status = 'cancelled', cancelled_at = NOW()` dla WSZYSTKICH aktywnych rejestracji na wydarzenia grupowe (webinar, team_training, meeting_public, auto_webinar)
- Rejestracje na spotkania indywidualne (meeting_private, tripartite_meeting, partner_consultation) zostają nietknięte — te są tworzone przez system rezerwacji i są poprawne
- Po resecie: 0 aktywnych zapisów na wydarzenia grupowe — każdy użytkownik musi się zapisać od nowa

**Krok 2: Domknięcie logiki rejestracji w `useEvents.ts`**
- `registerForEvent`: zmiana wyszukiwania istniejącej rejestracji z `occurrence_index` na `occurrence_date + occurrence_time` (dla multi-occurrence)
- `cancelRegistration`: analogicznie — anulowanie po `occurrence_date + occurrence_time` zamiast `occurrence_index`
- Dzięki temu nawet jeśli admin zmieni kolejność terminów, stare zapisy nie "ożyją"

**Krok 3: Domknięcie logiki w `EventCard.tsx`**
- Ujednolicenie z już poprawionym `EventCardCompact.tsx` — wyszukiwanie/re-aktywacja po dacie+godzinie zamiast indeksu

**Krok 4: Weryfikacja widżetu**
- `MyMeetingsWidget` już filtruje po `is_registered === true`
- `expandEventsForCalendar` już używa `registrationMap` opartej na `date:time`
- `fetchEvents` w `useEvents.ts` już buduje `registrationMap` ze stabilnych snapshotów
- Po resecie bazy i domknięciu ścieżek zapisu — widżet pokaże TYLKO to, na co użytkownik jawnie się zapisał

### Wpływ na użytkowników
- Wszyscy użytkownicy stracą zapisy na wydarzenia grupowe i muszą się zapisać ponownie
- Spotkania indywidualne (prywatne, trójstronne, konsultacje) pozostaną bez zmian
- Od tego momentu system będzie odporny na dryft indeksów

### Szczegóły techniczne

Migracja SQL:
```sql
UPDATE event_registrations 
SET status = 'cancelled', cancelled_at = NOW()
WHERE status = 'registered'
  AND event_id IN (
    SELECT id FROM events 
    WHERE event_type IN ('webinar', 'team_training', 'meeting_public', 'auto_webinar')
  );
```

Refaktor `registerForEvent` — zmiana klucza wyszukiwania z:
```typescript
query.eq('occurrence_index', occurrenceIndex)
```
na:
```typescript
query.eq('occurrence_date', occDate).eq('occurrence_time', occTime)
```

Analogiczna zmiana w `cancelRegistration` i `EventCard.tsx`.

### Pliki do zmiany
- `src/hooks/useEvents.ts` — registerForEvent, cancelRegistration
- `src/components/events/EventCard.tsx` — logika rejestracji
- Migracja SQL — reset rejestracji grupowych

