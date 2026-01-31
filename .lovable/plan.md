
# Plan: Poprawka wyświetlania stref czasowych dla webinarów i spotkań zespołu

## Problem

Na podstawie screenshotów użytkownika:

1. **Główna godzina wydarzeń** (np. "10:00 - 11:00") zmienia się nieprawidłowo gdy użytkownik ma inną strefę czasową - powinna być STAŁA
2. **Ramka porównania stref** ma wyglądać identycznie jak w spotkaniach indywidualnych (screenshot):
   - 🌍 **Twój czas:** 17:00 (Hebron)
   - ⏰ **Czas wydarzenia:** 16:00 (Warsaw)

## Obecny błąd

W `EventDetailsDialog.tsx`:
- Główna godzina jest wyświetlana ZAWSZE, ale może być źle formatowana
- W ramce porównania używamy `formatInTimeZone(eventStart, eventTimezone, ...)` - to POWINNO być stałe
- Problem może być w zapisie wydarzeń - czas nie jest konwertowany z lokalnej strefy do UTC z użyciem `fromZonedTime`

## Rozwiązanie

### 1. Naprawa zapisu w WebinarForm.tsx i TeamTrainingForm.tsx

Dodać import i użyć `fromZonedTime` przy zapisie, aby jawnie określić że czas jest w strefie Europe/Warsaw:

```typescript
import { fromZonedTime } from 'date-fns-tz';

// Zamiast:
const localDate = new Date(year, month - 1, day, hours, minutes);
setForm({ ...form, start_time: localDate.toISOString() });

// Na:
const localDateTime = new Date(year, month - 1, day, hours, minutes);
const eventTimezone = 'Europe/Warsaw'; // lub z formularza jeśli wybierany
const utcDateTime = fromZonedTime(localDateTime, eventTimezone);
setForm({ ...form, start_time: utcDateTime.toISOString() });
```

### 2. Weryfikacja wyświetlania w EventDetailsDialog.tsx

Upewnić się że struktura jest prawidłowa:

```typescript
{/* GŁÓWNA GODZINA - ZAWSZE STAŁA */}
<div className="flex items-center gap-2">
  <Clock className="h-4 w-4 text-muted-foreground" />
  <span>
    {formatInTimeZone(eventStart, eventTimezone, 'HH:mm')} - 
    {formatInTimeZone(eventEnd, eventTimezone, 'HH:mm')} 
    ({durationMinutes} min)
  </span>
</div>

{/* RAMKA PORÓWNANIA - tylko gdy strefy różne */}
{timezonesAreDifferent && (
  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
    <div className="flex items-center gap-2 text-sm">
      <Globe className="h-4 w-4 text-primary" />
      <span className="font-medium">Twój czas:</span>
      <span>
        {formatInTimeZone(eventStart, userTimezone, 'HH:mm')} 
        ({userTimezone.split('/')[1]?.replace('_', ' ')})
      </span>
    </div>
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span>Czas wydarzenia:</span>
      <span>
        {formatInTimeZone(eventStart, eventTimezone, 'HH:mm')} 
        ({eventTimezone.split('/')[1]?.replace('_', ' ')})
      </span>
    </div>
  </div>
)}
```

### 3. Poprawka w EventCardCompact.tsx

Analogiczna struktura dla mobilnego widoku rozwinięcia karty.

## Zmiany w plikach

| Plik | Zmiana |
|------|--------|
| `src/components/admin/WebinarForm.tsx` | Użyć `fromZonedTime` przy zapisie start_time |
| `src/components/admin/TeamTrainingForm.tsx` | Użyć `fromZonedTime` przy zapisie start_time |
| `src/components/events/EventDetailsDialog.tsx` | Zweryfikować strukturę (już powinna być OK z poprzedniej poprawki) |
| `src/components/events/EventCardCompact.tsx` | Zweryfikować formatowanie czasu |

## Rezultat końcowy

Wydarzenie ustawione na **10:00-11:00 CET**:

**W karcie:**
```
📅 20 stycznia 2026
⏰ 10:00 (CET)          ← STAŁA godzina
```

**W szczegółach (użytkownik w tej samej strefie):**
```
📅 Poniedziałek, 20 stycznia
⏰ 10:00 - 11:00 (60 min)   ← STAŁA godzina
```

**W szczegółach (użytkownik w innej strefie np. UTC+2):**
```
📅 Poniedziałek, 20 stycznia
⏰ 10:00 - 11:00 (60 min)   ← STAŁA godzina wydarzenia

┌────────────────────────────────────────────┐
│ 🌍 Twój czas:      11:00 (Hebron)         │
│ ⏰ Czas wydarzenia: 10:00 (Warsaw)         │
└────────────────────────────────────────────┘
```
