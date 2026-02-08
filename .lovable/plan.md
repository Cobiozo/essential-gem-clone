
# Plan: Naprawa widżetu "Moje spotkania" i limit wyświetlania

## Zdiagnozowany problem

### Przyczyna główna
Użytkownik Sebastian Snopek (i 24 innych) ma **legacy rejestrację** z `occurrence_index: NULL` dla wydarzenia multi-occurrence "Start nowego partnera":

| event_id | occurrence_index | status |
|----------|------------------|--------|
| 9d15f1de... | NULL | **registered** ← Problem |
| 9d15f1de... | 0 | cancelled |
| 9d15f1de... | 1 | cancelled |  
| 9d15f1de... | 2 | cancelled |

Użytkownik wypisał się z konkretnych terminów (0, 1, 2), ale pozostała "stara" rejestracja bez określonego terminu, która jest nadal `registered`.

### Logika w kodzie (linia 639-642)
```typescript
} else {
  // Single occurrence or legacy registration without occurrence_index
  startTimeForDedupe = new Date(baseEvent.start_time).toISOString();
  eventToPush = baseEvent;
}
```
System traktuje `occurrence_index: null` jako wydarzenie jednorazowe - pokazuje je z pierwszym terminem (12.02).

---

## Rozwiązanie dwuetapowe

### Etap 1: Poprawka logiki w useEvents.ts

Dla wydarzeń multi-occurrence z `occurrence_index: null`:
1. Sprawdzić, czy istnieją JAKIEKOLWIEK rejestracje z konkretnymi `occurrence_index` dla tego samego `event_id`
2. Jeśli tak - **pominąć** legacy rejestrację (konkretne rejestracje mają priorytet)
3. Jeśli nie ma konkretnych rejestracji - rozszerzyć legacy do wszystkich przyszłych terminów

**Plik:** `src/hooks/useEvents.ts`

```typescript
// Step 5: Expand multi-occurrence events based on user's registrations
const expandedEvents: EventWithRegistration[] = [];
const eventMap = new Map((events || []).map(e => [e.id, e]));
const seenEventTimes = new Set<string>();

// NEW: Build a map of event_id -> has specific occurrence registrations
const eventHasSpecificOccurrences = new Map<string, boolean>();
activeRegistrations.forEach(reg => {
  if (reg.occurrence_index !== null && reg.occurrence_index !== undefined) {
    eventHasSpecificOccurrences.set(reg.event_id, true);
  }
});

activeRegistrations.forEach(reg => {
  const event = eventMap.get(reg.event_id);
  if (!event) return;

  // NEW: For multi-occurrence events with null occurrence_index,
  // skip if there are specific occurrence registrations (they take precedence)
  if (isMultiOccurrenceEvent(event) && 
      reg.occurrence_index === null && 
      eventHasSpecificOccurrences.get(reg.event_id)) {
    console.log(`📅 Skipping legacy registration for ${event.title} - has specific occurrence registrations`);
    return;
  }

  // ... rest of existing logic
});
```

### Etap 2: Czyszczenie bazy danych

Usunięcie legacy rejestracji dla użytkowników, którzy mają nowsze rejestracje z konkretnymi terminami:

```sql
-- Delete legacy registrations where user has newer specific occurrence registrations
DELETE FROM event_registrations legacy
WHERE legacy.occurrence_index IS NULL
  AND legacy.status = 'registered'
  AND EXISTS (
    SELECT 1 FROM event_registrations specific
    WHERE specific.event_id = legacy.event_id
      AND specific.user_id = legacy.user_id
      AND specific.occurrence_index IS NOT NULL
  );
```

### Etap 3: Limit 3 spotkań per kategoria w widżecie

**Plik:** `src/components/dashboard/widgets/MyMeetingsWidget.tsx`

Zmiana linii 402 - obecnie pokazuje tylko 1 spotkanie i ma "rozwiń więcej":
```tsx
// Przed:
{(expandedTypes[type] ? events : events.slice(0, 1)).map((event, idx) => (

// Po - domyślnie 3, reszta zwija się:
{(expandedTypes[type] ? events : events.slice(0, 3)).map((event, idx) => (
```

Zmiana linii 437-446 dla poprawnego tekstu:
```tsx
// Przed:
{events.length > 1 && (
  ...
  {expandedTypes[type] ? 'Zwiń' : `+${events.length - 1} więcej`}

// Po:
{events.length > 3 && (
  ...
  {expandedTypes[type] ? 'Zwiń' : `+${events.length - 3} więcej`}
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/hooks/useEvents.ts` | Pomijanie legacy rejestracji gdy istnieją konkretne occurrence_index |
| `src/components/dashboard/widgets/MyMeetingsWidget.tsx` | Limit 3 spotkań per kategoria |
| Baza danych | Czyszczenie legacy rejestracji |

## Oczekiwany efekt

1. **Sebastian Snopek** - "Start nowego partnera" zniknie z widżetu (jest wypisany ze wszystkich terminów)
2. **Inni użytkownicy** - zobaczą tylko spotkania, na które są faktycznie zapisani
3. **Limit wyświetlania** - max 3 spotkania per kategoria, reszta pod "+X więcej"
4. **Real-time** - zmiany widoczne natychmiast po zapisie/wypisie
