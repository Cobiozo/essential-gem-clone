

# Plan: Naprawa wyświetlania czasów wydarzeń w strefie czasowej wydarzenia

## Problem

Czasy wydarzeń są wyświetlane w strefie czasowej przeglądarki użytkownika zamiast w strefie czasowej w której admin utworzył wydarzenie.

**Obecne zachowanie (BŁĘDNE):**
- Admin tworzy "O!Mega Chill" o 10:00 czasu polskiego (Europe/Warsaw)
- W bazie zapisuje się jako UTC 09:00 (bo CET = UTC+1)
- Użytkownik w Londynie (UTC+0) widzi czas jako 09:00 (jego lokalna strefa)
- Użytkownik w LA (UTC-8) widzi czas jako 01:00 (jego lokalna strefa)

**Oczekiwane zachowanie (POPRAWNE):**
- Wszystkie wyświetlane czasy powinny pokazywać 10:00 (PL)
- Czas oryginalny wydarzenia jest stały - to czas w strefie czasowej admina
- W szczegółach można dodatkowo pokazać przeliczenie na lokalną strefę użytkownika

## Przyczyna techniczna

Funkcja `format(date, 'HH:mm')` z date-fns formatuje datę w **lokalnej strefie czasowej przeglądarki**. To jest źródło problemu.

**Kod powodujący problem (występuje w wielu miejscach):**
```typescript
// ŹLE - formatuje w strefie przeglądarki
format(new Date(event.start_time), 'HH:mm')
// Wynik: 01:00 (dla użytkownika w LA gdy event jest o 10:00 PL)
```

**Poprawny kod:**
```typescript
// DOBRZE - formatuje w strefie czasowej wydarzenia
formatInTimeZone(new Date(event.start_time), eventTimezone, 'HH:mm')
// Wynik: 10:00 (zawsze, niezależnie od strefy przeglądarki)
```

## Zmiany do wprowadzenia

### 1. EventCardCompact.tsx

**Linia 560** - nagłówek karty:
```typescript
// Przed:
{format(startDate, 'HH:mm')}

// Po:
{formatInTimeZone(startDate, eventTimezone, 'HH:mm')}
```

**Linia 596** - rozwinięty widok mobilny:
```typescript
// Przed:
{format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}

// Po:
{formatInTimeZone(startDate, eventTimezone, 'HH:mm')} - {formatInTimeZone(endDate, eventTimezone, 'HH:mm')}
```

**Dodać zmienną eventTimezone** (około linia 165):
```typescript
const eventTimezone = (event as any).timezone || DEFAULT_EVENT_TIMEZONE;
```

**Dodać import:**
```typescript
import { formatInTimeZone } from 'date-fns-tz';
```

### 2. CalendarWidget.tsx

**Linia 386** - wyświetlanie czasu wydarzenia:
```typescript
// Przed:
{format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}

// Po:
{formatInTimeZone(new Date(event.start_time), eventTimezone, 'HH:mm')} - {formatInTimeZone(new Date(event.end_time), eventTimezone, 'HH:mm')}
```

**Import już istnieje** (linia 19)

### 3. MyMeetingsWidget.tsx

**Linia 419** - wyświetlanie czasu wydarzenia:
```typescript
// Przed:
{format(new Date(event.start_time), 'd MMM HH:mm', { locale })}

// Po - rozbić na dwie części:
{format(new Date(event.start_time), 'd MMM', { locale })} {formatInTimeZone(new Date(event.start_time), eventTimezone, 'HH:mm')}
```

**Dodać import:**
```typescript
import { formatInTimeZone } from 'date-fns-tz';
```

### 4. PastOccurrenceRow i OccurrenceRow (w EventCardCompact.tsx)

**Linie 57 i 105** - wyświetlanie czasu w occurrence rows:
```typescript
// Przed:
{format(occurrence.start_datetime, 'HH:mm')}

// Po:
{formatInTimeZone(occurrence.start_datetime, eventTimezone, 'HH:mm')}
```

Te komponenty muszą otrzymać `eventTimezone` jako prop.

### 5. CalendarWidget.tsx - funkcja handleCopyInvitation

**Linie 51** - tekst zaproszenia:
```typescript
// Przed:
⏰ Godzina: ${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}

// Po:
⏰ Godzina: ${formatInTimeZone(startDate, eventTimezone, 'HH:mm')} - ${formatInTimeZone(endDate, eventTimezone, 'HH:mm')} (${getTimezoneLabel(eventTimezone, 'short')})
```

### 6. EventCardCompact.tsx - funkcja handleCopyInvitation

**Linia 390** - tekst zaproszenia:
```typescript
// Przed:
⏰ Godzina: ${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}

// Po:
⏰ Godzina: ${formatInTimeZone(startDate, eventTimezone, 'HH:mm')} - ${formatInTimeZone(endDate, eventTimezone, 'HH:mm')} (${getTimezoneLabel(eventTimezone, 'short')})
```

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| EventCardCompact.tsx | Użyć formatInTimeZone zamiast format dla czasów, dodać eventTimezone, przekazać do OccurrenceRow |
| CalendarWidget.tsx | Użyć formatInTimeZone dla wyświetlania czasów i kopiowania zaproszeń |
| MyMeetingsWidget.tsx | Użyć formatInTimeZone dla wyświetlania czasów, dodać import |

## Oczekiwany rezultat

Po zmianach wszystkie czasy będą wyświetlane jako:
- `10:00 (PL)` zamiast `01:00 (PL)`
- Czas jest zawsze w strefie czasowej w której admin utworzył wydarzenie
- Etykieta (PL) informuje o strefie czasowej
- W szczegółach wydarzenia (EventDetailsDialog) użytkownik może zobaczyć przeliczenie na swoją lokalną strefę

