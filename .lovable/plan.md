

# Fix: Wydarzenia w News Ticker — minione znikają, cykliczne pokazują najbliższy termin

## Problem

Dwa błędy w `useNewsTickerData.ts`:

1. **Filtr `.gte('start_time', now)` odcina wydarzenia cykliczne** — jeśli `start_time` (pierwszy termin) już minął, cały event jest pomijany, nawet gdy ma przyszłe terminy w `occurrences`.
2. **Brak obsługi `occurrences`** — dla wydarzeń cyklicznych ticker zawsze wyświetla `start_time` zamiast najbliższego przyszłego terminu z tablicy `occurrences`.

## Rozwiązanie

### Plik: `src/components/news-ticker/useNewsTickerData.ts`

**Dla webinarów (linie 152-192) i spotkań zespołowych (linie 194-233):**

1. **Usunąć filtr** `.gte('start_time', now.toISOString())` z zapytania Supabase — pobrać wszystkie aktywne wybrane wydarzenia.
2. **Po pobraniu, dla każdego eventu:**
   - Użyć `isMultiOccurrenceEvent()` i `getNextActiveOccurrence()` z `useOccurrences.ts` do sprawdzenia czy event ma przyszłe terminy w `occurrences`.
   - Jeśli event ma `occurrences` → użyć daty najbliższego przyszłego terminu. Jeśli żaden termin nie jest przyszły → pominąć event.
   - Jeśli event nie ma `occurrences` → sprawdzić czy `end_time >= now`. Jeśli minął → pominąć.
3. **Dodać import** `isMultiOccurrenceEvent`, `getNextActiveOccurrence` z `@/hooks/useOccurrences`.

**Logika per event (pseudokod):**
```
for each event:
  if hasOccurrences(event):
    nextOcc = getNextActiveOccurrence(event)
    if !nextOcc → skip (all past)
    displayDate = nextOcc.start_datetime
  else:
    if event.end_time < now → skip
    displayDate = event.start_time
  
  push to allItems with formatted displayDate
```

| Plik | Zmiana |
|------|--------|
| `src/components/news-ticker/useNewsTickerData.ts` | Import helperów z useOccurrences, usunięcie filtra `.gte()`, dodanie logiki occurrences per event |

