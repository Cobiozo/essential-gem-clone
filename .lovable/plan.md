

# Analiza: strefy czasowe w auto-webinarach

## Obecny stan

System auto-webinarów **nie ma żadnej obsługi stref czasowych**. Każda operacja czasowa używa `new Date()` (czas lokalny przeglądarki):

- `useAutoWebinarSync.ts` → `now.getHours()`, `now.getMinutes()` — czas lokalny
- `AutoWebinarEventView.tsx` → `getSlotStatus()` porównuje `now.getHours() * 60 + now.getMinutes()` z godzinami slotów
- `isSlotToday()` / `isSlotInPast()` → `new Date().toISOString().slice(0,10)` — data UTC, nie lokalna
- Tabela `auto_webinar_config` nie ma kolumny `timezone`

### Konsekwencje

Sloty są zdefiniowane jako np. `["09:00", "11:30", "18:00"]` i oznaczają czas polski (CET). Ale:

1. **Gość w Nowym Jorku** widzi slot "11:30" i myśli, że to 11:30 jego czasu. Rejestruje się, dostaje link `?slot=2026-03-27_11:30`. Player porównuje z jego lokalnym 11:30 EST — wyświetla wideo. Ale w Polsce jest wtedy 17:30, a slot "11:30 CET" dawno minął. Gość ogląda "live" w zupełnie innym czasie niż inni.
2. **`isSlotToday()`** używa `toISOString().slice(0,10)` co daje datę UTC, nie lokalną — o 23:30 CET (22:30 UTC) system myśli, że jest ten sam dzień, ale o 01:00 CET (00:00 UTC) następnego dnia system widzi już jutrzejszą datę, więc slot z dzisiejszej daty jest uznawany za "w przeszłości".

### Pytanie kluczowe

Czy to jest realny problem? Auto-webinary są skierowane głównie do polskiego rynku. Jeśli goście są wyłącznie w strefie CET, obecne działanie jest poprawne — `new Date()` zwraca czas CET.

## Proponowane rozwiązanie

Dodać pole `timezone` do `auto_webinar_config` (domyślnie `Europe/Warsaw`) i przeliczać wszystkie czasy na tę strefę, niezależnie od przeglądarki gościa.

### 1. Migracja SQL
- `ALTER TABLE auto_webinar_config ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Europe/Warsaw'`

### 2. Helper: czas w strefie konfiguracji
Nowa funkcja `getNowInTimezone(tz)` zwracająca aktualną godzinę/minutę/sekundę w podanej strefie:
```typescript
function getNowInTimezone(tz: string) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  }).formatToParts(now);
  // extract h, m, s → secondsPastMidnight
}
```

### 3. Zmiany w `useAutoWebinarSync.ts`
- Przekazać `config.timezone` (fallback `Europe/Warsaw`)
- Zastąpić `now.getHours()` / `now.getMinutes()` wynikiem `getNowInTimezone(tz)`
- Naprawić `isSlotToday()` i `isSlotInPast()` — porównywać z datą w strefie konfiguracji, nie UTC

### 4. Zmiany w `AutoWebinarEventView.tsx`
- `getSlotStatus()` — użyć czasu w strefie konfiguracji zamiast `new Date().getHours()`
- Wyświetlić informację o strefie czasowej przy slotach (np. "11:30 CET")

### 5. Aktualizacja typu TypeScript
- Dodać `timezone` do typu `AutoWebinarConfig`

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Dodanie kolumny `timezone` |
| `src/hooks/useAutoWebinarSync.ts` | Przeliczanie czasu na strefę z configu |
| `src/components/auto-webinar/AutoWebinarEventView.tsx` | Status slotów wg strefy; label CET |
| `src/types/autoWebinar.ts` | Pole `timezone` w typie |

