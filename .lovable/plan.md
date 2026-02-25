
## Filtrowanie slotow na podstawie rejestracji lidera na wydarzenia

### Problem
Obecna logika blokuje sloty tylko jesli lider jest **gospodarzem** (`host_user_id`) wydarzenia platformowego. Uzytkownik chce, aby sloty byly blokowane rowniez gdy lider jest **zarejestrowany** (`event_registrations`) na dane wydarzenie. Jednoczesnie: jesli lider NIE jest zarejestrowany na wydarzenie (np. "Opportunity Meeting -- Italian"), slot powinien pozostac dostepny.

### Rozwiazanie

**Plik: `src/components/events/PartnerMeetingBooking.tsx`**

**Zmiana 1: Zapytanie o blokujace wydarzenia (linie 293-300)**

Zamiast filtrowania po `host_user_id = partnerId`, nowe podejscie:

1. Pobrac wydarzenia platformowe w danym dniu (bez filtra na hosta)
2. Pobrac rejestracje lidera na te wydarzenia z tabeli `event_registrations`
3. Blokowac slot tylko jesli lider jest hostem LUB jest zarejestrowany na to wydarzenie

Konkretnie:
- Zmiana zapytania `blockingResult` -- usuniecie filtra `.eq('host_user_id', partnerId)`, dodanie `.select('id, start_time, end_time')`
- Dodanie nowego rownoleglego zapytania do `event_registrations` filtrujacego po `user_id = partnerId` i `status = 'registered'`
- W sekcji filtrowania (linie 356-373): sprawdzenie czy event.id jest w zbiorze wydarzen na ktore lider jest zarejestrowany LUB czy lider jest hostem tego wydarzenia

**Zmiana 2: Sprawdzenie konfliktu przy potwierdzaniu (linie 591-611)**

Analogiczna zmiana -- zamiast blokowania wszystkich wydarzen platformowych, sprawdzic czy lider jest zarejestrowany na kolidujace wydarzenie lub jest jego hostem.

### Szczegoly techniczne

Zapytania rownolegle w `loadAvailableSlots`:

```text
// Zapytanie 1: Wydarzenia platformowe w danym dniu (BEZ filtra host_user_id)
supabase
  .from('events')
  .select('id, start_time, end_time')
  .in('event_type', ['webinar', 'spotkanie_zespolu', 'team_training', 'meeting_public'])
  .gte('end_time', `${dateStr}T00:00:00`)
  .lte('start_time', `${dateStr}T23:59:59`)
  .eq('is_active', true)

// Zapytanie 2: Rejestracje lidera
supabase
  .from('event_registrations')
  .select('event_id')
  .eq('user_id', partnerId)
  .eq('status', 'registered')
```

Filtrowanie:
```text
const registeredEventIds = new Set(registrations.map(r => r.event_id));

// Blokuj slot tylko jesli lider jest zarejestrowany na to wydarzenie
// LUB jest jego hostem (zachowanie dotychczasowe)
platformEvents.forEach(event => {
  if (!registeredEventIds.has(event.id)) return; // lider nie zapisany = slot dostepny
  // ... istniejaca logika overlap checking
});
```

Dla sprawdzenia konfliktu przy potwierdzaniu (linia 591+): dodanie analogicznego zapytania o rejestracje i filtrowanie tylko wydarzen na ktore lider jest zapisany lub jest hostem.
