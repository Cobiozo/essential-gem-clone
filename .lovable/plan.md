

## Diagnoza: Zmiana czasu CET → CEST powoduje błąd godziny w powiadomieniach

### Problem

Jutro (30 marca 2026) zegary przesuwają się z CET (UTC+1) na CEST (UTC+2). Wydarzenie jest o **20:00 czasu warszawskiego**, ale powiadomienia mówią **21:00**.

### Przyczyna — hardcoded offset `+01:00` zamiast DST-aware parsowania

W **dwóch edge functions** czas z pola `occurrences` (np. `date: "2026-03-30", time: "20:00"`) jest parsowany z błędnym offsetem:

**1. `send-bulk-webinar-reminders/index.ts` (linia 296):**
```javascript
// BŁĄD: zawsze +01:00 (CET), ignoruje czas letni
termDatetime = new Date(`${occ.date}T${occ.time}:00+01:00`);
```
Dla 30 marca: `20:00+01:00` = 19:00 UTC. Ale poprawnie powinno być `20:00+02:00` = 18:00 UTC.
Gdy 19:00 UTC jest formatowane z `timeZone: 'Europe/Warsaw'` (CEST), wychodzi **21:00** zamiast 20:00.

**2. `process-pending-notifications/index.ts` (linia 401-404):**
```javascript
// BŁĄD: heurystyka miesiącowa — marzec (3) < 4, więc używa +01:00
const month = parseInt(occ.date.split('-')[1], 10);
const offset = (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
```
Marzec = 3, więc wybiera CET (+01:00), mimo że 30 marca to już CEST. Ta sama heurystyka zawodzi też w październiku (miesiąc 10 = CEST, ale pod koniec października wraca CET).

### Frontend jest OK
Frontend (`useOccurrences.ts`) używa `fromZonedTime(localDateTime, 'Europe/Warsaw')` z biblioteki `date-fns-tz`, która poprawnie obsługuje DST. Problem dotyczy tylko edge functions na serwerze.

### Rozwiązanie

Zastąpić hardcoded offsety prawidłowym DST-aware parsowaniem. Deno obsługuje `Intl.DateTimeFormat` z `timeZone`, więc możemy obliczyć prawidłowy offset dla dowolnej daty:

**Nowa funkcja pomocnicza** (do `_shared/` lub inline):
```typescript
function warsawToUtc(dateStr: string, timeStr: string): Date {
  // Tworzymy datę i sprawdzamy jaki offset ma Warsaw w tym dniu
  // Używamy Intl do uzyskania prawidłowego offsetu
  const naive = new Date(`${dateStr}T${timeStr}:00Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Warsaw',
    hour: 'numeric', minute: 'numeric', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const parts = formatter.formatToParts(naive);
  // Odczytujemy jaki czas Warsaw pokazuje dla tego UTC
  // i obliczamy różnicę, żeby ustalić offset
  const wHour = +parts.find(p => p.type === 'hour')!.value;
  const wMin = +parts.find(p => p.type === 'minute')!.value;
  const uHour = naive.getUTCHours();
  const uMin = naive.getUTCMinutes();
  let offsetMinutes = (wHour * 60 + wMin) - (uHour * 60 + uMin);
  if (offsetMinutes < -720) offsetMinutes += 1440;
  if (offsetMinutes > 720) offsetMinutes -= 1440;
  // offsetMinutes = +60 (CET) lub +120 (CEST)
  // Chcemy: dateStr+timeStr w Warsaw = UTC - offset
  return new Date(`${dateStr}T${timeStr}:00Z`);
  // Corrected: subtract offset to get UTC
  // new Date(Date.UTC(y, m, d, h, min) - offsetMinutes * 60000)
}
```

Zastosujemy prostsze podejście — parsowanie przez `Temporal` API (dostępne w Deno) lub iteracyjne obliczenie offsetu via `Intl`.

### Pliki do zmiany

1. **`supabase/functions/_shared/timezone-utils.ts`** — nowa funkcja `warsawLocalToUtc(date, time)` z poprawną obsługą DST
2. **`supabase/functions/send-bulk-webinar-reminders/index.ts`** — zamiana hardcoded `+01:00` na `warsawLocalToUtc()`
3. **`supabase/functions/process-pending-notifications/index.ts`** — zamiana heurystyki miesiącowej na `warsawLocalToUtc()`

### Wpływ

- Jutrzejsze wydarzenie o 20:00 będzie poprawnie wyświetlane jako 20:00 w powiadomieniach
- Okna przypomnienia (24h, 12h, 2h, 1h, 15min) będą prawidłowo obliczane
- Żadnych zmian w frontendzie — tam `date-fns-tz` już działa poprawnie

