
# Plan: Wyświetlanie stref czasowych dla webinarów i spotkań zespołu

## Problem

Obecnie webinary i spotkania zespołu wyświetlają czas bez uwzględnienia strefy czasowej. Użytkownicy z różnych stref czasowych (np. CET vs GMT) widzą ten sam czas bez konwersji, co prowadzi do nieporozumień.

**Przykład:**
- Admin tworzy webinar na 21:00 CET (Europe/Warsaw)
- Użytkownik z Anglii (GMT) widzi "21:00" zamiast "20:00 (czas lokalny)" lub "21:00 (PL)"

## Rozwiązanie

Wdrożyć politykę "fixed-timezone display" - wyświetlać czas w strefie czasowej wydarzenia z wyraźnym oznaczeniem, a w dialogu szczegółów pokazać również konwersję na czas lokalny użytkownika.

## Architektura rozwiązania

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  WEBINAR/SPOTKANIE - Wyświetlanie czasu                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  W kartach wydarzeń (główny widok):                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  📅 30 stycznia 2026                                                   │  │
│  │  ⏰ 21:00 (CET)                                                        │  │
│  │     ↑ Czas w strefie wydarzenia + oznaczenie strefy                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  W dialogu szczegółów (jeśli różne strefy):                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  📅 Piątek, 30 stycznia                                                │  │
│  │  ⏰ 21:00 - 22:30 (60 min) (CET)                                       │  │
│  │                                                                        │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │ 🌍 Czas w Twojej strefie: 20:00 - 21:30 (GMT)                   │  │  │
│  │  │    (Wykryto różnicę stref czasowych)                            │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Zmiany w plikach

### 1. EventCardCompact.tsx - Główne karty wydarzeń

**Zmiana wyświetlania czasu:**

Zamienić:
```typescript
format(startDate, 'HH:mm')
```

Na:
```typescript
formatInTimeZone(startDate, eventTimezone, 'HH:mm') + ` (${getTimezoneAbbr(eventTimezone)})`
```

**Dodać import:**
```typescript
import { formatInTimeZone } from 'date-fns-tz';
```

**Dodać helper do skrótu strefy:**
```typescript
const getTimezoneAbbr = (tz: string) => {
  const abbrs: Record<string, string> = {
    'Europe/Warsaw': 'CET',
    'Europe/London': 'GMT',
    'America/New_York': 'EST',
    // ... inne popularne strefy
  };
  return abbrs[tz] || tz.split('/').pop();
};
```

### 2. EventDetailsDialog.tsx - Dialog szczegółów

**Dodać sekcję porównania stref czasowych:**

```typescript
// Wykryj strefę użytkownika
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const eventTimezone = event.timezone || 'Europe/Warsaw';
const timezonesAreDifferent = userTimezone !== eventTimezone;

// W sekcji czasu:
<div className="flex items-center gap-2">
  <Clock className="h-4 w-4 text-muted-foreground" />
  <span>
    {formatInTimeZone(eventStart, eventTimezone, 'HH:mm')} - 
    {formatInTimeZone(eventEnd, eventTimezone, 'HH:mm')} 
    ({durationMinutes} min) ({getTimezoneAbbr(eventTimezone)})
  </span>
</div>

// Dodać sekcję porównania (jeśli różne strefy):
{timezonesAreDifferent && (
  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm">
    <Globe className="h-4 w-4 text-blue-500" />
    <span>
      Twój czas: {formatInTimeZone(eventStart, userTimezone, 'HH:mm')} - 
      {formatInTimeZone(eventEnd, userTimezone, 'HH:mm')} 
      ({getTimezoneAbbr(userTimezone)})
    </span>
  </div>
)}
```

### 3. CalendarWidget.tsx - Widżet kalendarza

**Zmienić formatowanie czasu w liście wydarzeń dnia:**

```typescript
// Zamiast:
{format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}

// Na:
{formatInTimeZone(new Date(event.start_time), event.timezone || 'Europe/Warsaw', 'HH:mm')} - 
{formatInTimeZone(new Date(event.end_time), event.timezone || 'Europe/Warsaw', 'HH:mm')} 
({getTimezoneAbbr(event.timezone || 'Europe/Warsaw')})
```

### 4. MyMeetingsWidget.tsx - Widżet "Moje spotkania"

**Podobna zmiana jak w CalendarWidget:**

```typescript
{formatInTimeZone(new Date(event.start_time), event.timezone || 'Europe/Warsaw', 'd MMM HH:mm')} 
({getTimezoneAbbr(event.timezone || 'Europe/Warsaw')})
```

### 5. EventCard.tsx - Pełna karta wydarzenia

**Zmienić wyświetlanie daty/czasu:**

```typescript
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <Clock className="h-4 w-4" />
  <span>
    {formatInTimeZone(startDate, event.timezone || 'Europe/Warsaw', 'HH:mm')} - 
    {formatInTimeZone(endDate, event.timezone || 'Europe/Warsaw', 'HH:mm')}
    ({getTimezoneAbbr(event.timezone || 'Europe/Warsaw')})
  </span>
</div>
```

### 6. Nowy helper: src/utils/timezoneHelpers.ts

```typescript
export const TIMEZONE_ABBREVIATIONS: Record<string, string> = {
  'Europe/Warsaw': 'CET',
  'Europe/Berlin': 'CET',
  'Europe/Paris': 'CET',
  'Europe/London': 'GMT',
  'Europe/Dublin': 'GMT',
  'Europe/Lisbon': 'WET',
  'America/New_York': 'EST',
  'America/Chicago': 'CST',
  'America/Los_Angeles': 'PST',
  'Asia/Tokyo': 'JST',
  'Asia/Shanghai': 'CST',
  'Australia/Sydney': 'AEST',
};

export const getTimezoneAbbr = (timezone: string): string => {
  return TIMEZONE_ABBREVIATIONS[timezone] || timezone.split('/').pop() || 'UTC';
};

export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Europe/Warsaw';
  }
};
```

### 7. WebinarForm.tsx i TeamTrainingForm.tsx (opcjonalne)

Dodać selektor strefy czasowej dla admina, aby mógł jawnie wybrać strefę przy tworzeniu wydarzenia (zamiast domyślnej Europe/Warsaw).

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/utils/timezoneHelpers.ts` | Nowy helper z mapowaniem stref na skróty |
| `src/components/events/EventCardCompact.tsx` | Dodanie sufiksu strefy czasowej do wyświetlanego czasu |
| `src/components/events/EventDetailsDialog.tsx` | Sekcja porównania "Czas wydarzenia" vs "Twój czas" |
| `src/components/events/EventCard.tsx` | Dodanie sufiksu strefy czasowej |
| `src/components/dashboard/widgets/CalendarWidget.tsx` | Formatowanie czasu z `formatInTimeZone` |
| `src/components/dashboard/widgets/MyMeetingsWidget.tsx` | Formatowanie czasu z `formatInTimeZone` |

## Kluczowe zasady

1. **Czas główny = strefa wydarzenia**: Zawsze wyświetlamy czas w strefie, w której wydarzenie zostało utworzone (domyślnie Europe/Warsaw)

2. **Wyraźne oznaczenie**: Każdy czas ma sufiks ze skrótem strefy, np. "(CET)", "(GMT)"

3. **Porównanie opcjonalne**: W dialogu szczegółów, jeśli strefa użytkownika różni się od strefy wydarzenia, pokazujemy dodatkową linię z konwersją

4. **Brak automatycznej konwersji głównego czasu**: NIE konwertujemy głównie wyświetlanego czasu na strefę użytkownika - to prowadziłoby do zamieszania ("o której naprawdę jest webinar?")

## Korzyści

- Użytkownicy z różnych stref wiedzą, że 21:00 CET to 21:00 w strefie polskiej
- W dialogu szczegółów mogą sprawdzić, jaka to godzina u nich lokalnie
- Spójna polityka wyświetlania we wszystkich komponentach
- Zgodność z istniejącym rozwiązaniem dla spotkań indywidualnych
