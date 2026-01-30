
# Plan: Obsługa stref czasowych dla wydarzeń publicznych (webinary, spotkania zespołu)

## Problem

Gdy admin tworzy wydarzenie (np. "O!Mega Chill" o 10:00 czasu polskiego), użytkownik w Anglii lub USA widzi tę samą godzinę 10:00-11:00 bez informacji o strefie czasowej. Prowadzi to do nieporozumień - użytkownik z Los Angeles (PST) może myśleć, że spotkanie jest o 10:00 jego czasu, podczas gdy w rzeczywistości jest to 10:00 CET (czyli 01:00 PST).

**Obecna sytuacja:**
- Tabela `events` ma kolumnę `timezone` (TEXT), ale nie jest ona używana
- Formularze tworzenia wydarzeń nie pozwalają ustawić strefy czasowej
- Wyświetlanie godzin nie zawiera informacji o strefie czasowej
- Brak przeliczania czasu dla użytkowników w innych strefach

## Proponowane rozwiązanie

### Część 1: Zapisywanie strefy czasowej przy tworzeniu wydarzenia

**Formularze admina (WebinarForm.tsx, TeamTrainingForm.tsx):**
- Dodać selektor strefy czasowej z domyślną wartością `Europe/Warsaw`
- Zapisywać wybraną strefę w kolumnie `events.timezone`
- Informacja wizualna przy polu daty/godziny: "Czas w strefie: Europe/Warsaw"

### Część 2: Wyświetlanie z oznaczeniem strefy (minimalne)

Na listach wydarzeń i w kalendarzu pokazać oznaczenie strefy przy czasie:

```
Przed:  10:00 - 11:00
Po:     10:00 - 11:00 (PL)
```

Gdzie "(PL)" to skrót od Europe/Warsaw. Podobnie "(UK)" dla Europe/London, "(NY)" dla America/New_York itd.

### Część 3: Szczegóły wydarzenia z dwoma czasami

W dialogu szczegółów (EventDetailsDialog.tsx) i rozwiniętym widoku karty (EventCardCompact.tsx) pokazać oba czasy gdy strefa użytkownika różni się od strefy wydarzenia:

```
┌─────────────────────────────────────────────────────┐
│ 🕐 Czas wydarzenia                                  │
│                                                     │
│ Czas oryginalny:  10:00 - 11:00 (Polska, CET)       │
│ Twój czas:        09:00 - 10:00 (Wielka Brytania)   │
│                                                     │
│ lub gdy strefy są takie same:                       │
│ 10:00 - 11:00 (Polska, CET) ✓ Twoja strefa          │
└─────────────────────────────────────────────────────┘
```

### Część 4: Widget kalendarza i "Moje spotkania"

**CalendarWidget.tsx:**
- Przy wyświetlaniu godziny dodać skrót strefy: `10:00 - 11:00 (PL)`
- W rozwiniętej sekcji dnia pokazać konwersję jeśli strefa różna

**MyMeetingsWidget.tsx:**
- Format godziny: `31 sty 10:00 (PL)` zamiast `31 sty 10:00`

## Zmiany w plikach

### 1. Formularze tworzenia wydarzeń

**src/components/admin/WebinarForm.tsx:**
- Dodać stan `timezone` z domyślną wartością `Europe/Warsaw`
- Dodać selektor strefy czasowej obok pola daty/godziny
- Zapisywać do bazy przy tworzeniu/edycji

**src/components/admin/TeamTrainingForm.tsx:**
- Analogiczne zmiany jak w WebinarForm

### 2. Nowy helper do formatowania stref czasowych

**src/lib/timezone-utils.ts (nowy plik):**
```typescript
// Mapowanie stref na czytelne skróty
const TIMEZONE_LABELS: Record<string, { short: string; full: string }> = {
  'Europe/Warsaw': { short: 'PL', full: 'Polska (CET)' },
  'Europe/London': { short: 'UK', full: 'Wielka Brytania (GMT)' },
  'Europe/Berlin': { short: 'DE', full: 'Niemcy (CET)' },
  'America/New_York': { short: 'NY', full: 'Nowy Jork (EST)' },
  'America/Los_Angeles': { short: 'LA', full: 'Los Angeles (PST)' },
  // ...
};

// Funkcja konwertująca czas z jednej strefy do drugiej
export function convertEventTime(
  eventTime: Date, 
  eventTimezone: string, 
  userTimezone: string
): Date;

// Funkcja formatująca czas z etykietą strefy
export function formatTimeWithTimezone(
  time: Date, 
  timezone: string,
  format: 'short' | 'full'
): string;

// Sprawdzenie czy strefy są różne
export function areTimezonesEqual(tz1: string, tz2: string): boolean;
```

### 3. Komponenty wyświetlające wydarzenia

**src/components/events/EventCardCompact.tsx:**
- Import helpera timezone-utils
- Pobierać `event.timezone` (domyślnie `Europe/Warsaw` jeśli brak)
- W wyświetlaniu godzin dodać etykietę: `{format(..., 'HH:mm')} ({getTimezoneLabel(event.timezone)})`
- W rozwiniętym widoku pokazać sekcję z konwersją stref jeśli różne

**src/components/events/EventDetailsDialog.tsx:**
- Dodać sekcję "Strefy czasowe" pod datą/godziną
- Pokazać czas oryginalny (strefa wydarzenia) i czas użytkownika (strefa przeglądarki)
- Wizualne wyróżnienie gdy strefy są różne

**src/components/dashboard/widgets/CalendarWidget.tsx:**
- Przy formacie godziny dodać skrót strefy
- W rozwiniętych eventach pokazać konwersję

**src/components/dashboard/widgets/MyMeetingsWidget.tsx:**
- Dodać skrót strefy przy wyświetlanej godzinie

### 4. Hook do wykrywania strefy użytkownika

**src/hooks/useUserTimezone.ts (nowy plik):**
```typescript
export function useUserTimezone() {
  // Automatyczne wykrywanie strefy przeglądarki
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Możliwość ręcznego override
  const [selectedTimezone, setSelectedTimezone] = useState(browserTimezone);
  
  return {
    timezone: selectedTimezone,
    setTimezone: setSelectedTimezone,
    isAutoDetected: selectedTimezone === browserTimezone,
  };
}
```

## Podsumowanie zmian

| Komponent | Zmiana |
|-----------|--------|
| WebinarForm | Selektor strefy przy tworzeniu |
| TeamTrainingForm | Selektor strefy przy tworzeniu |
| EventCardCompact | Etykieta (PL) przy godzinie, sekcja konwersji w detailach |
| EventDetailsDialog | Sekcja stref z czasem oryginalnym i użytkownika |
| CalendarWidget | Etykieta strefy przy godzinach wydarzeń |
| MyMeetingsWidget | Etykieta strefy przy godzinach |
| timezone-utils.ts | Nowy helper do konwersji i formatowania |
| useUserTimezone.ts | Nowy hook do wykrywania strefy użytkownika |

## Korzyści

1. **Jasność** - użytkownik zawsze wie, w której strefie czasowej jest wydarzenie
2. **Automatyczna konwersja** - użytkownik widzi czas w swojej strefie
3. **Spójność** - wszystkie komponenty używają tego samego systemu
4. **Kompatybilność wsteczna** - istniejące wydarzenia bez `timezone` domyślnie używają `Europe/Warsaw`
