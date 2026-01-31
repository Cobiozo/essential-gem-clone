
# Plan: Naprawa parsowania stref czasowych dla wydarzeń cyklicznych

## Problem

W funkcji `parseOccurrence` w `src/hooks/useOccurrences.ts` czas występowania (occurrence) jest parsowany jako czas lokalny przeglądarki użytkownika zamiast jako czas w strefie wydarzenia (Europe/Warsaw).

### Przykład błędu:

**Dane w bazie:**
```json
{ "date": "2026-01-31", "time": "10:00", "duration_minutes": 60 }
timezone: Europe/Warsaw
```

**Przy użytkowniku z London (UTC):**
1. `new Date(2026, 0, 31, 10, 0)` tworzy datę jako 10:00 **w strefie London** (UTC)
2. `toISOString()` daje `2026-01-31T10:00:00.000Z` (10:00 UTC)
3. `formatInTimeZone(..., 'Europe/Warsaw', 'HH:mm')` wyświetla **11:00** (bo Warsaw = UTC+1)

**Powinno być:**
1. `10:00` powinno być interpretowane jako 10:00 **Warsaw**
2. To odpowiada `09:00 UTC`
3. Dla użytkownika z London: wyświetlane jako `09:00` (jego czas) vs `10:00` (czas wydarzenia)

## Rozwiązanie

### 1. Zmiana w `src/hooks/useOccurrences.ts`

**Linia 9-14 - funkcja `parseOccurrence`:**

```typescript
// PRZED (błędnie):
const start_datetime = new Date(year, month - 1, day, hours, minutes);

// PO (poprawnie):
import { fromZonedTime } from 'date-fns-tz';
import { DEFAULT_EVENT_TIMEZONE } from '@/utils/timezoneHelpers';

// Interpretuj czas jako Warsaw (strefa utworzenia), nie jako lokalna przeglądarka
const start_datetime = fromZonedTime(
  new Date(year, month - 1, day, hours, minutes),
  DEFAULT_EVENT_TIMEZONE
);
```

### 2. Zmiany szczegółowe

**Dodać importy na górze pliku:**
```typescript
import { fromZonedTime } from 'date-fns-tz';
import { DEFAULT_EVENT_TIMEZONE } from '@/utils/timezoneHelpers';
```

**Zmienić funkcję `parseOccurrence`:**
```typescript
export const parseOccurrence = (occurrence: EventOccurrence, index: number): ExpandedOccurrence => {
  const [year, month, day] = occurrence.date.split('-').map(Number);
  const [hours, minutes] = occurrence.time.split(':').map(Number);
  
  // Create a local-like Date object representing the time parts
  const localDateTime = new Date(year, month - 1, day, hours, minutes);
  
  // Convert from event timezone (Warsaw) to UTC
  // This ensures 10:00 Warsaw = 09:00 UTC, regardless of user's browser timezone
  const start_datetime = fromZonedTime(localDateTime, DEFAULT_EVENT_TIMEZONE);
  const end_datetime = addMinutes(start_datetime, occurrence.duration_minutes);
  const now = new Date();
  
  return {
    ...occurrence,
    index,
    start_datetime,
    end_datetime,
    is_past: isAfter(now, end_datetime),
  };
};
```

## Rezultat

**Po naprawie:**

Wydarzenie utworzone na 10:00 Warsaw, oglądane przez użytkownika z London:

**W karcie:**
```
📅 31 stycznia 2026
⏰ 10:00 (CET)          ← STAŁA godzina wydarzenia
```

**W dialogu szczegółów:**
```
📅 Sobota, 31 stycznia
⏰ 10:00 - 11:00 (60 min)   ← STAŁA godzina wydarzenia

┌────────────────────────────────────────────┐
│ 🌍 Twój czas:      09:00 (London)         │  ← 1h wcześniej
│ ⏰ Czas wydarzenia: 10:00 (Warsaw)         │  ← stały
└────────────────────────────────────────────┘
```

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/hooks/useOccurrences.ts` | Użyć `fromZonedTime(localDateTime, DEFAULT_EVENT_TIMEZONE)` zamiast `new Date(...)` |

## Notatka techniczna

`fromZonedTime(date, timezone)` interpretuje podaną datę jako będącą w danej strefie czasowej i zwraca jej odpowiednik UTC. Dzięki temu:
- Admin wpisuje 10:00 → zapisywane jest jako "10:00 Warsaw" 
- System przechowuje to jako 09:00 UTC
- `formatInTimeZone(..., 'Europe/Warsaw', 'HH:mm')` zawsze pokaże 10:00
- `formatInTimeZone(..., 'Europe/London', 'HH:mm')` pokaże 09:00
