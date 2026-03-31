

# Fix: Goście otrzymują powiadomienia o terminach, na które nie są zarejestrowani

## Problem
W `send-bulk-webinar-reminders/index.ts` istnieją dwa fallbacki "legacy", które powodują, że rejestracje **bez `occurrence_index`** (lub bez `occurrence_date`) otrzymują przypomnienia o **KAŻDYM** terminie wydarzenia cyklicznego:

**Linia 448 (użytkownicy)**:
```typescript
r.occurrence_index === null  // ← pasuje do WSZYSTKICH terminów
```

**Linia 408 (goście)**:
```typescript
g.occurrence_index === null  // ← pasuje do WSZYSTKICH terminów
```

Po globalnym resecie rejestracji w marcu 2026, te fallbacki nie są już potrzebne — każda nowa rejestracja posiada `occurrence_date` i `occurrence_time`. Te fallbacki powodują, że goście jak Hybert i Testomir dostają e-maile o terminie 01.04.2026, mimo że nie zarejestrowali się na ten konkretny slot.

## Fix — `supabase/functions/send-bulk-webinar-reminders/index.ts`

### Zmiana 1: Usunięcie fallbacku dla gości (linia ~406-410)
```typescript
// Strict filtering: only guests registered for THIS specific occurrence
guests = guests.filter(g =>
  g.occurrence_index === termOccurrenceIndex
);
```
Usunięcie `g.occurrence_index === null` — gość bez przypisanego terminu NIE powinien dostawać powiadomień o żadnym terminie.

### Zmiana 2: Usunięcie fallbacków legacy dla użytkowników (linia ~442-449)
```typescript
relevantUserRegs = relevantUserRegs.filter(r =>
  // Match by stable date+time snapshot
  (r.occurrence_date === targetDate && r.occurrence_time === targetTime) ||
  // Fallback: legacy index-only match (no date stored)
  (r.occurrence_date === null && r.occurrence_index === termOccurrenceIndex)
);
```
Usunięcie `r.occurrence_index === null` — rejestracja bez żadnej informacji o terminie NIE powinna automatycznie pasować do wszystkich terminów. Zachowujemy fallback na `occurrence_index` gdy brak `occurrence_date` (starsze rejestracje z indeksem ale bez daty).

### Zmiana 3: Logowanie odrzuconych rejestracji
Dodanie logowania ile rejestracji zostało odfiltrowanych, aby ułatwić debugowanie w przyszłości.

## Efekt
- Goście i użytkownicy dostaną e-mail TYLKO o terminie, na który się faktycznie zarejestrowali
- Brak "legacy" zachowania rozsyłającego powiadomienia do wszystkich terminów
- Wymaga redeployment edge function `send-bulk-webinar-reminders`

## Pliki do edycji
- `supabase/functions/send-bulk-webinar-reminders/index.ts`

