

# Fix: Okno przypomnienia 24h jest za szerokie (24-30h → 24-25h)

## Problem

W `process-pending-notifications/index.ts` linia 321-322, okno dla 24h reminders to **24-30 godzin** przed startem. CRON uruchamia się co ~30 minut, więc okno 6-godzinne jest niepotrzebnie szerokie. Webinar o 20:00 Warsaw (19:00 UTC) dostaje reminder już o 14:00 Warsaw (13:00 UTC = 30h przed), zamiast ~20:00 dnia poprzedniego.

## Rozwiązanie

Zawęzić okno z 24-30h do **23.5-25h**. Przy CRON co 30 min, okno 1.5h daje pewność złapania eventu, a reminder przyjdzie w okolicy 24h przed startem (±30 min).

### Zmiana w `supabase/functions/process-pending-notifications/index.ts`:

Linie ~320-322:
```typescript
// PRZED:
const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
const thirtyHoursFromNow = new Date(now.getTime() + 30 * 60 * 60 * 1000).toISOString();

// PO:
const twentyThreeAndHalfHoursFromNow = new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString();
const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();
```

I odpowiednio zaktualizować zmienne w zapytaniu `.gte()` / `.lte()`.

Analogicznie sprawdzić i zawęzić okna dla reminderów 1h i 15min (jeśli mają podobny problem).

### Pliki do edycji:
- `supabase/functions/process-pending-notifications/index.ts` — zawężenie okien czasowych dla 24h, 1h i 15min reminderów

