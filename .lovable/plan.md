
# Plan: Poprawa wyświetlania daty i strefy czasowej w EventCardCompact

## Zidentyfikowane problemy

### Problem 1: Błędna data w nagłówku karty cyklicznej
Na screenie widać datę "24 sty" w nagłówku karty, mimo że to minione spotkanie. Dla wydarzeń cyklicznych nagłówek powinien pokazywać datę **najbliższego przyszłego** spotkania (31 sty).

**Przyczyna**: Kod w linii 558-567 używa `startDate` (z `event.start_time`), które odnosi się do pierwszego wystąpienia, a nie do najbliższego.

### Problem 2: Brak porównania stref czasowych
W karcie wydarzeń brakuje ramki "Twój czas" / "Czas wydarzenia" dla użytkowników z innej strefy czasowej. Ta ramka jest już zaimplementowana w `EventDetailsDialog.tsx`, ale nie ma jej w `EventCardCompact.tsx`.

## Rozwiązanie

### Zmiana 1: Wyświetlanie daty najbliższego wystąpienia w nagłówku

W sekcji nagłówka (linie ~557-567) dla wydarzeń cyklicznych użyć daty z `getNextActiveOccurrence()`:

```typescript
// Ustalenie daty do wyświetlenia w nagłówku
const nextOccurrence = isMultiOccurrence ? getNextActiveOccurrence(event) : null;
const displayDate = nextOccurrence ? nextOccurrence.start_datetime : startDate;
```

Następnie w nagłówku użyć `displayDate` zamiast `startDate`.

### Zmiana 2: Dodanie ramki porównania stref czasowych

Dodać logikę wykrywania różnicy stref (jak w EventDetailsDialog):

```typescript
import { getUserTimezone } from '@/utils/timezoneHelpers';

// W komponencie:
const eventTimezone = event.timezone || DEFAULT_EVENT_TIMEZONE;
const userTimezone = getUserTimezone();
const timezonesAreDifferent = userTimezone !== eventTimezone;
```

Dodać ramkę porównania pod opisem wydarzenia w rozwiniętym widoku:

```tsx
{timezonesAreDifferent && (
  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
    <div className="flex items-center gap-2 text-sm">
      <Globe className="h-4 w-4 text-primary" />
      <span className="font-medium">Twój czas:</span>
      <span>
        {formatInTimeZone(startDate, userTimezone, 'HH:mm')} 
        ({userTimezone.split('/')[1]?.replace('_', ' ')})
      </span>
    </div>
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span>Czas wydarzenia:</span>
      <span>
        {formatInTimeZone(startDate, eventTimezone, 'HH:mm')} 
        ({eventTimezone.split('/')[1]?.replace('_', ' ')})
      </span>
    </div>
  </div>
)}
```

## Zmiany w plikach

| Plik | Zmiana |
|------|--------|
| `src/components/events/EventCardCompact.tsx` | 1) Dodać import `getUserTimezone` 2) Użyć `getNextActiveOccurrence()` dla daty w nagłówku 3) Dodać logikę porównania stref 4) Dodać ramkę porównania w rozwinięciu |

## Szczegółowe lokalizacje zmian

### 1. Import (linia ~12)
```typescript
import { getTimezoneAbbr, DEFAULT_EVENT_TIMEZONE, getUserTimezone } from '@/utils/timezoneHelpers';
```

### 2. Import funkcji (linia ~32)
```typescript
import { isMultiOccurrenceEvent, getAllOccurrences, getNextActiveOccurrence } from '@/hooks/useOccurrences';
```

### 3. Zmienne w komponencie (po linii ~180)
```typescript
// Dla nagłówka: data najbliższego wystąpienia (lub start_time dla zwykłych)
const nextOccurrence = isMultiOccurrence ? getNextActiveOccurrence(event) : null;
const displayDate = nextOccurrence ? nextOccurrence.start_datetime : startDate;

// Porównanie stref czasowych
const eventTimezone = event.timezone || DEFAULT_EVENT_TIMEZONE;
const userTimezone = getUserTimezone();
const timezonesAreDifferent = userTimezone !== eventTimezone;
```

### 4. Nagłówek - data (linie ~558-566)
Zamienić `startDate` na `displayDate`:
```typescript
<span>{format(displayDate, 'd MMM', { locale: dateLocale })}</span>
...
<span>{formatInTimeZone(displayDate, eventTimezone, 'HH:mm')} ({getTimezoneAbbr(eventTimezone)})</span>
```

### 5. Ramka porównania w CollapsibleContent (przed sekcją "Details grid", po opisie, ~linia 620)
```tsx
{/* Timezone comparison - when user is in different timezone */}
{timezonesAreDifferent && (
  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
    <div className="flex items-center gap-2 text-sm">
      <Globe className="h-4 w-4 text-primary flex-shrink-0" />
      <span className="font-medium">Twój czas:</span>
      <span>
        {formatInTimeZone(displayDate, userTimezone, 'HH:mm')} ({userTimezone.split('/')[1]?.replace('_', ' ') || userTimezone})
      </span>
    </div>
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="h-4 w-4 flex-shrink-0" />
      <span>Czas wydarzenia:</span>
      <span>
        {formatInTimeZone(displayDate, eventTimezone, 'HH:mm')} ({eventTimezone.split('/')[1]?.replace('_', ' ') || eventTimezone})
      </span>
    </div>
  </div>
)}
```

## Rezultat

Po zmianach dla wydarzenia cyklicznego "O!Mega Chill":

**Nagłówek karty:**
- Data: **31 sty** (zamiast 24 sty) ← najbliższe przyszłe spotkanie
- Czas: **10:00 (CET)**

**Rozwinięta karta (gdy użytkownik z Arizony):**
```
┌─────────────────────────────────────────────┐
│ 🌍 Twój czas:      02:00 (Phoenix)         │
│ ⏰ Czas wydarzenia: 10:00 (Warsaw)          │
└─────────────────────────────────────────────┘
```

**Lista terminów:**
- ~~24 sty (Sobota) 10:00 (CET)~~ **Zakończony** ✓ Uczestniczył
- 31 sty (Sobota) 10:00 (CET) [Wypisz się]
