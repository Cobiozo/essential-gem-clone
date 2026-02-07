
# Plan naprawy: Stabilna synchronizacja Google Calendar

## Zidentyfikowane problemy

### Problem 1: Brak usuwania wydarzeń z Google Calendar przy wypisaniu się (KRYTYCZNY)

**Przyczyna główna:** Niezgodność `occurrence_index` między tworzeniem a usuwaniem rekordów synchronizacji.

| Operacja | Co się dzieje | Skutek |
|----------|---------------|--------|
| Rejestracja na wystąpienie #0 | Tworzy `event_google_sync` z `occurrence_index = 0` | ✓ Poprawne |
| Ręczna resync wszystkich | Tworzy `event_google_sync` z `occurrence_index = NULL` | ✗ BUG |
| Wypisanie z wystąpienia #0 | Szuka `occurrence_index = 0`, nie znajduje (jest NULL) | ✗ Wydarzenie pozostaje w Google Calendar |

**Lokalizacja błędu:**
- `src/hooks/useGoogleCalendar.ts` linie 346-374 - funkcja `syncAllEvents` nie pobiera `occurrence_index` z rejestracji

### Problem 2: Edge Function `sync-google-calendar` - sztywne dopasowanie `occurrence_index`

Logika usuwania wymaga DOKŁADNEGO dopasowania:
- Jeśli rejestracja ma `occurrence_index = 0`, szuka rekordu z `occurrence_index = 0`
- Jeśli rekord sync ma `occurrence_index = NULL` (legacy), nie jest znajdowany

### Problem 3: Widżet "Moje spotkania" pokazuje nieaktualne dane

**Potencjalne przyczyny:**
1. Cache React Query nie jest invalidowany poprawnie
2. Subskrypcja Realtime na tablicę `events` jest zbyt szeroka (bez filtra)
3. Użytkownik może widzieć stare dane z poprzedniej sesji

---

## Faza 1: Naprawa `syncAllEvents` w useGoogleCalendar.ts

**Plik:** `src/hooks/useGoogleCalendar.ts`

**Zmiana 1:** Pobieranie `occurrence_index` z rejestracji (linia 346-348)

```typescript
// BYŁO:
const { data: registrations, error: regError } = await supabase
  .from('event_registrations')
  .select('event_id')
  .eq('user_id', user.id)
  .eq('status', 'registered');

// MA BYĆ:
const { data: registrations, error: regError } = await supabase
  .from('event_registrations')
  .select('event_id, occurrence_index')  // Dodane occurrence_index
  .eq('user_id', user.id)
  .eq('status', 'registered');
```

**Zmiana 2:** Przekazywanie `occurrence_index` przy synchronizacji (linia 369-375)

```typescript
// BYŁO:
const result = await supabase.functions.invoke('sync-google-calendar', {
  body: {
    user_id: user.id,
    event_id: reg.event_id,
    action: 'create',
  },
});

// MA BYĆ:
const result = await supabase.functions.invoke('sync-google-calendar', {
  body: {
    user_id: user.id,
    event_id: reg.event_id,
    action: 'create',
    occurrence_index: reg.occurrence_index,  // Dodane przekazanie indeksu
  },
});
```

---

## Faza 2: Ulepszona logika usuwania w Edge Function (fallback)

**Plik:** `supabase/functions/sync-google-calendar/index.ts`

Problem: Stare rekordy sync mają `occurrence_index = NULL`, ale użytkownik wypisuje się z konkretnego wystąpienia.

**Rozwiązanie:** Dodanie fallback przy usuwaniu - jeśli nie znaleziono rekordu z konkretnym `occurrence_index`, spróbuj z `NULL`:

```typescript
// Linia ~425 w processSyncForUser, w bloku action === 'delete':

if (action === 'delete' && eventId) {
  // Krok 1: Szukaj z konkretnym occurrence_index
  let syncQuery = supabaseAdmin
    .from('event_google_sync')
    .select('google_event_id')
    .eq('event_id', eventId)
    .eq('user_id', userId);
  
  if (occurrenceIndex !== undefined) {
    syncQuery = syncQuery.eq('occurrence_index', occurrenceIndex);
  } else {
    syncQuery = syncQuery.is('occurrence_index', null);
  }
  
  let { data: syncRecord } = await syncQuery.single();

  // Krok 2: FALLBACK - jeśli nie znaleziono, spróbuj z NULL (legacy)
  if (!syncRecord?.google_event_id && occurrenceIndex !== undefined) {
    console.log('[sync-google-calendar] No record with occurrence_index, trying fallback with NULL');
    const { data: fallbackRecord } = await supabaseAdmin
      .from('event_google_sync')
      .select('google_event_id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .is('occurrence_index', null)
      .single();
    
    if (fallbackRecord?.google_event_id) {
      syncRecord = fallbackRecord;
      console.log('[sync-google-calendar] Found legacy sync record with NULL occurrence_index');
    }
  }

  // Krok 3: Krok 3 - MULTI-FALLBACK: szukaj dowolnego rekordu dla tego eventu
  if (!syncRecord?.google_event_id) {
    console.log('[sync-google-calendar] Trying any sync record for event');
    const { data: anyRecord } = await supabaseAdmin
      .from('event_google_sync')
      .select('google_event_id, occurrence_index')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .limit(1)
      .single();
    
    if (anyRecord?.google_event_id) {
      syncRecord = anyRecord;
      console.log('[sync-google-calendar] Found sync record with different occurrence_index:', anyRecord.occurrence_index);
    }
  }

  if (syncRecord?.google_event_id) {
    const deleted = await deleteGoogleEvent(accessToken, calendarId, syncRecord.google_event_id);
    
    if (deleted) {
      // Usuń rekord sync bez filtra occurrence_index (usuń wszystkie dla tego eventu+user)
      await supabaseAdmin
        .from('event_google_sync')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('google_event_id', syncRecord.google_event_id);
    }

    const responseTime = Date.now() - startTime;
    logSyncOperation(supabaseAdmin, userId, eventId, action, deleted ? 'success' : 'error', responseTime, deleted ? undefined : 'Delete failed', { occurrence_index: occurrenceIndex });
    return { success: deleted };
  }

  // Nie znaleziono żadnego rekordu
  const responseTime = Date.now() - startTime;
  logSyncOperation(supabaseAdmin, userId, eventId, action, 'skipped', responseTime, 'No sync record found', { occurrence_index: occurrenceIndex });
  return { success: true, reason: 'no_sync_record' };
}
```

---

## Faza 3: Naprawa widżetu "Moje spotkania"

**Plik:** `src/components/dashboard/widgets/MyMeetingsWidget.tsx`

### Zmiana 1: Dodanie filtra do subskrypcji events (linie 78-92)

Obecna subskrypcja nasłuchuje NA WSZYSTKIE zmiany w tabeli `events`, co jest nieefektywne i może powodować problemy z danymi.

```typescript
// BYŁO:
const eventsChannel = supabase
  .channel(eventsChannelName)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'events'
    },
    () => {
      fetchUserEventsData();
    }
  )
  .subscribe();

// MA BYĆ:
// Nie potrzebujemy subskrypcji na wszystkie eventy
// Subskrypcja na registrations z filtrem user_id wystarczy
// USUŃ tę subskrypcję - jest niepotrzebna i powoduje nadmiarowe odświeżenia
```

### Zmiana 2: Dodanie wymuszenia świeżych danych przy montowaniu

```typescript
// Na początku fetchUserEventsData:
const fetchUserEventsData = useCallback(async () => {
  setLoading(true);
  // Dodaj timestamp do logów dla debugowania
  console.log('[MyMeetingsWidget] Fetching events at:', new Date().toISOString());
  const events = await getUserEventsRef.current();
  console.log('[MyMeetingsWidget] Got events:', events.length);
  setUserEvents(events);
  setLoading(false);
}, []);
```

---

## Faza 4: Migracja istniejących rekordów sync (OPCJONALNA)

Dla naprawy historycznych rekordów, można uruchomić jednorazową migrację SQL:

```sql
-- Aktualizacja rekordów event_google_sync gdzie occurrence_index jest NULL
-- a event ma occurrences (jest cykliczny)
UPDATE event_google_sync egs
SET occurrence_index = 0
WHERE egs.occurrence_index IS NULL
AND EXISTS (
  SELECT 1 FROM events e 
  WHERE e.id = egs.event_id 
  AND e.occurrences IS NOT NULL
);
```

Ta migracja jest opcjonalna - fallback w Edge Function powinien obsłużyć legacy przypadki.

---

## Faza 5: Dodanie logowania i diagnostyki

**Plik:** `src/hooks/useEvents.ts`

Dodanie szczegółowego logowania w `cancelRegistration`:

```typescript
const cancelRegistration = async (eventId: string, occurrenceIndex?: number): Promise<boolean> => {
  if (!user) return false;

  try {
    console.log('[useEvents] Cancel registration:', { eventId, occurrenceIndex, userId: user.id });
    
    // ... existing code ...
    
    console.log('[useEvents] Sending delete to Google Calendar:', { 
      eventId, 
      occurrenceIndex,
      hasOccurrenceIndex: occurrenceIndex !== undefined 
    });
    
    const res = await supabase.functions.invoke('sync-google-calendar', {
      body: { user_id: user.id, event_id: eventId, action: 'delete', occurrence_index: occurrenceIndex }
    });
    
    console.log('[useEvents] Google Calendar delete response:', res.data);
    
    // ... rest of code ...
```

---

## Podsumowanie zmian

| Plik | Zmiana | Priorytet |
|------|--------|-----------|
| `src/hooks/useGoogleCalendar.ts` | Dodanie `occurrence_index` do syncAllEvents | KRYTYCZNY |
| `supabase/functions/sync-google-calendar/index.ts` | Fallback przy usuwaniu (szukaj z NULL jeśli nie znaleziono) | KRYTYCZNY |
| `src/components/dashboard/widgets/MyMeetingsWidget.tsx` | Usunięcie zbędnej subskrypcji events, lepsze logowanie | WYSOKI |
| `src/hooks/useEvents.ts` | Dodatkowe logowanie w cancelRegistration | ŚREDNI |

---

## Diagram przepływu (po naprawie)

```text
┌─────────────────────────────────────────────────────────────────┐
│                    REJESTRACJA NA WYDARZENIE                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Użytkownik zapisuje się na wystąpienie #2 eventu cyklicznego │
│ 2. registerForEvent(eventId, occurrenceIndex=2)                  │
│ 3. sync-google-calendar(action='create', occurrence_index=2)    │
│ 4. event_google_sync: {event_id, user_id, occurrence_index: 2}  │
│ 5. Google Calendar: Dodane wydarzenie z datą wystąpienia #2     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WYPISANIE Z WYDARZENIA                         │
├─────────────────────────────────────────────────────────────────┤
│ 1. Użytkownik wypisuje się z wystąpienia #2                     │
│ 2. cancelRegistration(eventId, occurrenceIndex=2)               │
│ 3. sync-google-calendar(action='delete', occurrence_index=2)    │
│ 4. Szukaj: event_google_sync WHERE occurrence_index=2           │
│    └─> ZNALEZIONO → Usuń z Google Calendar ✓                    │
│    └─> NIE ZNALEZIONO → Fallback: szukaj z NULL                 │
│        └─> ZNALEZIONO → Usuń z Google Calendar ✓                │
│        └─> NIE ZNALEZIONO → Szukaj dowolny rekord               │
│            └─> ZNALEZIONO → Usuń z Google Calendar ✓            │
│ 5. Google Calendar: Usunięte wydarzenie                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Oczekiwane rezultaty

1. **100% usunięć z Google Calendar** - fallback zapewnia usunięcie nawet przy niezgodności indeksów
2. **Spójność danych** - nowe rejestracje będą miały poprawny `occurrence_index` w sync
3. **Mniej redundantnych odświeżeń** - usunięcie zbędnej subskrypcji events
4. **Lepsza diagnostyka** - szczegółowe logi ułatwią debugowanie przyszłych problemów
