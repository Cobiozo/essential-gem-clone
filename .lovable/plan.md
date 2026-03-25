

# Naprawa: Formularz rejestracyjny ignoruje slot_hours

## Problem
W `EventGuestRegistration.tsx` (linia 265) zapytanie do bazy pobiera tylko `start_hour, end_hour, interval_minutes` — **brakuje `slot_hours`**. Przez to `getNextSlot()` zawsze używa starej logiki interwałowej (np. od 10:00 co godzinę) zamiast jawnie zdefiniowanych godzin emisji. Gość zapraszany na 01:00 widzi w formularzu "10:00".

## Rozwiązanie

### 1. `src/pages/EventGuestRegistration.tsx`

**Linia 265** — dodać `slot_hours` do SELECT:
```sql
.select('start_hour, end_hour, interval_minutes, slot_hours')
```

**Linia 571** — zmienić warunek wyświetlania tekstu "Pokój otworzy się 5 minut przed" z `interval_minutes >= 30` na sprawdzanie czy `slot_hours` istnieje:
```typescript
// Zamiast: autoWebinarConfig.interval_minutes >= 30
// Użyj: autoWebinarConfig.slot_hours?.length > 0 || autoWebinarConfig.interval_minutes >= 30
```

Ta sama zmiana w liniach 429 i 468 (ekran sukcesu).

To jednolinijkowa poprawka — `getNextSlot()` już obsługuje `slot_hours` poprawnie (linia 41-83), po prostu nie dostawał tych danych z bazy.

