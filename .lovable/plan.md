

## Plan: Nie zaliczaj starych rejestracji do nowych terminów w wydarzeniach cyklicznych

### Problem
Gdy admin edytuje zakończone wydarzenie i dodaje nowe terminy (occurrences), użytkownicy którzy byli zapisani na stare terminy automatycznie pojawiają się jako zapisani na nowe. Dzieje się tak z dwóch powodów:

1. **Legacy null registration** — stare rejestracje mają `occurrence_index = null`. Logika w `expandEventsForCalendar` (linia 167) przypisuje taką rejestrację do najbliższego przyszłego terminu, traktując ją jako "aktywną".

2. **Event-level `is_registered`** — w `useEvents.ts` linia 133: `is_registered: registeredEventIds.has(event.id)` — jeśli user ma JAKĄKOLWIEK rejestrację na event_id (nawet na stary, zakończony termin), cały event dostaje `is_registered = true`.

### Rozwiązanie

#### 1. `src/hooks/useOccurrences.ts` — wyłącz legacy match dla multi-occurrence
Zmiana w `expandEventsForCalendar`: usunąć logikę `legacyMatch`. Rejestracja z `occurrence_index = null` NIE powinna automatycznie zaliczać użytkownika do żadnego przyszłego terminu. Jeśli event stał się multi-occurrence, użytkownik musi się zapisać na każdy termin osobno.

```typescript
// BEFORE (line 167):
const legacyMatch = !hasSpecificRegistration && hasLegacyNullRegistration && occ.index === nextActiveIndex;
const isRegisteredForOccurrence = specificMatch || legacyMatch;

// AFTER:
const isRegisteredForOccurrence = specificMatch;
```

#### 2. `src/hooks/useEvents.ts` — `is_registered` per-occurrence aware
Zmiana na linii 133: dla eventów z occurrences, `is_registered` powinno być `false` na poziomie eventu (bo `expandEventsForCalendar` ustawi to per-occurrence). Tylko dla eventów BEZ occurrences zostawiamy obecną logikę.

```typescript
// BEFORE:
is_registered: registeredEventIds.has(event.id),

// AFTER:
is_registered: isMultiOccurrenceEvent(event) ? false : registeredEventIds.has(event.id),
```

To zapewni że `expandEventsForCalendar` jest jedynym źródłem prawdy o rejestracji dla multi-occurrence events.

#### 3. `src/hooks/usePublicEvents.ts` — analogiczna zmiana
Linia 102 — ta sama poprawka co w `useEvents.ts`:
```typescript
is_registered: isMultiOccurrenceEvent(event) ? false : registeredEventIds.has(event.id),
```

### Efekt
- Stare rejestracje (occurrence_index = null) NIE będą przenoszone na nowe terminy
- Każdy nowy termin wymaga osobnego kliknięcia "Zapisz się"
- Edytowane zakończone wydarzenia z nowymi terminami traktowane jak nowe — nikt nie jest automatycznie zapisany
- Widget "Moje spotkania" pokaże tylko terminy na które user faktycznie się zapisał

### Pliki do modyfikacji
1. `src/hooks/useOccurrences.ts` — usunięcie legacy null match
2. `src/hooks/useEvents.ts` — is_registered aware of multi-occurrence
3. `src/hooks/usePublicEvents.ts` — analogicznie

