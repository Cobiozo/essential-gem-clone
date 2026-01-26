

# Plan: Naprawa synchronizacji spotkań cyklicznych z Google Calendar

## Zdiagnozowany problem

Edge function `sync-google-calendar` otrzymuje `occurrence_index` od frontendu, ale **kompletnie go ignoruje**. Pobiera dane eventu z tabeli `events` gdzie `start_time` to data PIERWSZEGO terminu cyklu (np. 20.01), a nie konkretnej daty na którą zapisał się użytkownik (np. 27.01).

### Przykład błędu

```text
Event: "Pure Calling"
├── start_time w bazie: 2026-01-20 10:00 (data pierwszego terminu)
├── occurrences: [
│     { date: "2026-01-20", time: "11:00", duration_minutes: 60 },  // index 0
│     { date: "2026-01-20", time: "17:00", duration_minutes: 60 },  // index 1
│     ...
│     { date: "2026-01-27", time: "11:00", duration_minutes: 60 },  // index 6 ← użytkownik się zapisuje
│     ...
│   ]

Użytkownik zapisuje się na termin 27.01 11:00 (index 6)
→ Frontend wysyła: { occurrence_index: 6 }
→ Edge function pobiera start_time z bazy: 20.01 10:00
→ Edge function IGNORUJE occurrence_index
→ Google Calendar: event pod datą 20.01 ❌
```

---

## Rozwiązanie

### Zmiana w `sync-google-calendar` edge function

Edge function musi:
1. Pobrać pole `occurrences` razem z danymi eventu
2. Jeśli `occurrence_index` jest przekazany i event ma tablicę `occurrences`:
   - Wyciągnąć konkretny termin z tablicy
   - Użyć tej daty/godziny zamiast bazowego `start_time`

---

## Sekcja techniczna

### Plik: `supabase/functions/sync-google-calendar/index.ts`

**Zmiana 1 - Dodanie `occurrence_index` do interfejsu (linia 8-13):**

```typescript
interface SyncRequest {
  user_id?: string;
  user_ids?: string[]; // Support batch sync
  event_id?: string;
  action: 'create' | 'update' | 'delete' | 'test';
  occurrence_index?: number;  // ← DODAĆ
}
```

**Zmiana 2 - Pobranie `occurrences` z bazy (linie 573-587):**

```typescript
const { data: eventResult, error: eventError } = await supabaseAdmin
  .from('events')
  .select(`
    id,
    title,
    description,
    start_time,
    end_time,
    zoom_link,
    event_type,
    host_user_id,
    occurrences   // ← DODAĆ
  `)
  .eq('id', event_id)
  .single();
```

**Zmiana 3 - Dodanie funkcji pomocniczej do parsowania occurrence:**

```typescript
// Get specific occurrence datetime for cyclic events
function getOccurrenceDateTime(
  occurrences: any, 
  occurrenceIndex: number | undefined,
  baseStartTime: string,
  baseEndTime: string | null
): { start_time: string; end_time: string } {
  // If no occurrence_index or no occurrences array, use base times
  if (occurrenceIndex === undefined || occurrenceIndex === null) {
    return { 
      start_time: baseStartTime, 
      end_time: baseEndTime || new Date(new Date(baseStartTime).getTime() + 60*60*1000).toISOString()
    };
  }

  // Parse occurrences (can be string or array)
  let parsedOccurrences: any[] | null = null;
  
  if (Array.isArray(occurrences)) {
    parsedOccurrences = occurrences;
  } else if (typeof occurrences === 'string') {
    try {
      parsedOccurrences = JSON.parse(occurrences);
    } catch {
      parsedOccurrences = null;
    }
  }

  // If no valid occurrences or index out of range, use base times
  if (!parsedOccurrences || !Array.isArray(parsedOccurrences) || occurrenceIndex >= parsedOccurrences.length) {
    console.log('[sync-google-calendar] No valid occurrence found for index:', occurrenceIndex);
    return { 
      start_time: baseStartTime, 
      end_time: baseEndTime || new Date(new Date(baseStartTime).getTime() + 60*60*1000).toISOString()
    };
  }

  const occurrence = parsedOccurrences[occurrenceIndex];
  
  // Parse occurrence date/time
  const [year, month, day] = occurrence.date.split('-').map(Number);
  const [hours, minutes] = occurrence.time.split(':').map(Number);
  const durationMinutes = occurrence.duration_minutes || 60;

  // Create Date objects in Europe/Warsaw timezone
  const startDate = new Date(year, month - 1, day, hours, minutes);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  console.log('[sync-google-calendar] Using occurrence', occurrenceIndex, ':', occurrence.date, occurrence.time);

  return {
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
  };
}
```

**Zmiana 4 - Użycie konkretnego terminu przed formatowaniem (po linii 597):**

```typescript
eventData = eventResult;

// DODAĆ: Override start/end times with specific occurrence if provided
const { occurrence_index } = requestData;
if (occurrence_index !== undefined && eventData) {
  const occurrenceTimes = getOccurrenceDateTime(
    eventResult.occurrences,
    occurrence_index,
    eventResult.start_time,
    eventResult.end_time
  );
  
  eventData = {
    ...eventData,
    start_time: occurrenceTimes.start_time,
    end_time: occurrenceTimes.end_time,
  };
  
  console.log('[sync-google-calendar] Cyclic event: using occurrence', occurrence_index, 
    'date:', occurrenceTimes.start_time);
}
```

**Zmiana 5 - Unikalny klucz sync dla każdego occurrence (linie 406-418):**

Zmiana klucza `event_google_sync` aby uwzględniał `occurrence_index`:

```typescript
// Save sync record - include occurrence_index in lookup
if (eventId) {
  // For cyclic events, use composite key with occurrence_index
  const syncKey = occurrence_index !== undefined 
    ? `${eventId}:${occurrence_index}` 
    : eventId;
    
  await supabaseAdmin
    .from('event_google_sync')
    .upsert({
      event_id: eventId,
      user_id: userId,
      google_event_id: googleEventId,
      synced_at: new Date().toISOString(),
      occurrence_index: occurrence_index ?? null,  // Store occurrence index
    }, {
      onConflict: 'event_id,user_id,occurrence_index',  // Updated constraint
    });
}
```

**Zmiana 6 - Aktualizacja delete/update aby uwzględniało occurrence (linie 331-358):**

```typescript
if (action === 'delete' && eventId) {
  // Get existing sync record - include occurrence_index in lookup
  let syncQuery = supabaseAdmin
    .from('event_google_sync')
    .select('google_event_id')
    .eq('event_id', eventId)
    .eq('user_id', userId);
  
  // Add occurrence_index filter for cyclic events
  if (occurrence_index !== undefined) {
    syncQuery = syncQuery.eq('occurrence_index', occurrence_index);
  } else {
    syncQuery = syncQuery.is('occurrence_index', null);
  }
  
  const { data: syncRecord } = await syncQuery.single();
  // ... rest of delete logic
}
```

---

## Zmiana w bazie danych

### Dodanie kolumny `occurrence_index` do `event_google_sync`

```sql
-- Add occurrence_index column
ALTER TABLE event_google_sync 
ADD COLUMN IF NOT EXISTS occurrence_index INTEGER DEFAULT NULL;

-- Drop old constraint and create new composite one
ALTER TABLE event_google_sync 
DROP CONSTRAINT IF EXISTS event_google_sync_event_id_user_id_key;

-- Create new unique constraint including occurrence_index
CREATE UNIQUE INDEX IF NOT EXISTS event_google_sync_unique_idx 
ON event_google_sync (event_id, user_id, COALESCE(occurrence_index, -1));
```

---

## Podsumowanie zmian

| Plik/Zasób | Zmiana | Cel |
|------------|--------|-----|
| `sync-google-calendar/index.ts` | Dodanie `occurrence_index` do interfejsu | Odczyt parametru |
| `sync-google-calendar/index.ts` | Pobranie `occurrences` z bazy | Dostęp do wszystkich terminów |
| `sync-google-calendar/index.ts` | Funkcja `getOccurrenceDateTime()` | Parsowanie konkretnego terminu |
| `sync-google-calendar/index.ts` | Override `start_time`/`end_time` | Użycie poprawnej daty |
| `sync-google-calendar/index.ts` | Sync record z `occurrence_index` | Osobny wpis dla każdego terminu |
| Migracja SQL | Kolumna `occurrence_index` | Przechowywanie indeksu |

---

## Efekt końcowy

**Przed:**
```
Zapis na 27.01 11:00 → Google Calendar pokazuje event pod 20.01 10:00 ❌
```

**Po:**
```
Zapis na 27.01 11:00 → Google Calendar pokazuje event pod 27.01 11:00 ✅
```

Każdy termin spotkania cyklicznego będzie synchronizowany z właściwą datą w Google Calendar.

