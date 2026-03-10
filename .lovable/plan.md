

# Zmiana interwału CRON i osobne resultKey dla 12h/2h

## Zmiany w `supabase/functions/process-pending-notifications/index.ts`

### 1. Dodanie osobnych resultKey dla 12h i 2h (linia 78-89)
Dodaj `webinarReminders12h` i `webinarReminders2h` do obiektu `results`:
```typescript
const results = {
  // ...existing...
  webinarReminders24h: { processed: 0, success: 0, failed: 0 },
  webinarReminders12h: { processed: 0, success: 0, failed: 0 },  // NOWY
  webinarReminders2h: { processed: 0, success: 0, failed: 0 },   // NOWY
  webinarReminders1h: { processed: 0, success: 0, failed: 0 },
  webinarReminders15min: { processed: 0, success: 0, failed: 0 },
  // ...existing...
};
```

### 2. Poprawienie mapowania resultKey w reminderWindows (linia 326-335)
Zmienić typ unii i przypisania:
- `12h` → `resultKey: "webinarReminders12h"` (zamiast `"webinarReminders24h"`)
- `2h` → `resultKey: "webinarReminders2h"` (zamiast `"webinarReminders24h"`)

### 3. Zmiana interwału CRON na 5 minut
Zmienić domyślny fallback z `180` na `5` (linia 179):
```typescript
const intervalMinutes = cronSettings?.interval_minutes || 5;
```
Plus: zaktualizować wartość `interval_minutes` w tabeli `cron_settings` na `5` za pomocą SQL insert tool.

## Zmiana w bazie danych
```sql
UPDATE cron_settings
SET interval_minutes = 5
WHERE job_name = 'process-pending-notifications';
```

## Podsumowanie zmian
- 2 nowe klucze wyników (`webinarReminders12h`, `webinarReminders2h`) — osobne statystyki
- Interwał CRON: 180 min → 5 min — pokrycie wąskich okien 15min i 1h
- Domyślny fallback: 180 → 5

