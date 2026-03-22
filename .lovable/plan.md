

# Fix: Nadchodzące spotkania zespołowe nie pojawiają się w News Ticker

## Problem (3 błędy)

1. **Admin lista wydarzeń** (`NewsTickerManagement.tsx`) pobiera tylko `event_type = 'team_training'`, pomijając `meeting_public`. Zapytanie: `.in('event_type', ['webinar', 'team_training'])` — brak `meeting_public`.

2. **Admin lista — status "minęło"** bazuje na `isPast(start_time)` bez uwzględnienia `occurrences`. Wydarzenie cykliczne, którego `start_time` minął, ale ma przyszłe terminy, jest pokazywane jako "minęło" i wyszarzone.

3. **Ticker data hook** (`useNewsTickerData.ts`) filtruje spotkania tylko po `event_type = 'team_training'`, pomijając `meeting_public`.

## Rozwiązanie

### 1. `NewsTickerManagement.tsx` — lista wydarzeń w panelu admina

**Zapytanie Supabase** (linia ~204): dodać `meeting_public` do filtra:
```typescript
.in('event_type', ['webinar', 'team_training', 'meeting_public'])
```

**Filtrowanie spotkań** (linia 434): uwzględnić oba typy:
```typescript
const meetings = allEvents.filter(e => e.event_type === 'team_training' || e.event_type === 'meeting_public');
```

**EventItem interface** (linia 71): dodać pole `occurrences`:
```typescript
interface EventItem {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  is_active: boolean;
  occurrences?: any;
}
```

**Zapytanie select** (linia 203): dodać `occurrences`:
```typescript
.select('id, title, event_type, start_time, is_active, occurrences')
```

**Wyświetlanie daty i statusu "minęło"** (linie 728-746 i 772-794): zamiast `isPast(eventDate)` użyć logiki occurrences — jeśli event ma occurrences, sprawdzić `getNextActiveOccurrence()` i wyświetlić najbliższy przyszły termin. Dodać import helperów z `useOccurrences`.

### 2. `useNewsTickerData.ts` — pobieranie spotkań do tickera

**Sekcja "Fetch SELECTED team meetings"** (linia ~213): dodać `meeting_public`:
```typescript
.in('event_type', ['team_training', 'meeting_public'])
```
(zamiast `.eq('event_type', 'team_training')`)

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/admin/NewsTickerManagement.tsx` | Dodać `meeting_public` do zapytania i filtra, pobrać `occurrences`, naprawić logikę "minęło" |
| `src/components/news-ticker/useNewsTickerData.ts` | Dodać `meeting_public` do filtra event_type |

