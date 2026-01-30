
# Plan: Naprawa błędu React Hooks w EventDetailsDialog

## Problem

Błąd "Rendered more hooks than during the previous render" w `EventDetailsDialog.tsx` na linii 70.

### Przyczyna techniczna

Hooki `useMemo` (linie 85-115) są wywoływane **PO** warunkowym `return null` (linia 72):

```typescript
// Linia 72 - PROBLEM: early return przed hookami
if (!event) return null;

// Linie 85-115 - Te hooki są pomijane gdy event === null
const userStartTime = useMemo(() => {...}, [...]); // ❌ Hook po return null
const userEndTime = useMemo(() => {...}, [...]);   // ❌ Hook po return null
const eventStartTimeFormatted = useMemo(() => {...}, [...]); // ❌
const eventEndTimeFormatted = useMemo(() => {...}, [...]); // ❌
```

**Sekwencja renderowania:**
1. Pierwszy render z `event = null`: React widzi 3 hooki (useLanguage, useState x2, useEffect)
2. Drugi render z `event = {dane}`: React widzi 7 hooków (3 poprzednie + 4 useMemo)
3. React rzuca błąd: "Rendered more hooks than during the previous render"

## Rozwiązanie

Przenieść wszystkie hooki PRZED warunkowy `return null`. Hooki muszą być zawsze wywoływane w tej samej kolejności.

### Zmiany w pliku `src/components/events/EventDetailsDialog.tsx`

**1. Przenieść `useMemo` przed `if (!event) return null`:**

```typescript
export const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({
  event,
  open,
  onOpenChange,
  onRegister,
  onCancelRegistration,
}) => {
  const { language } = useLanguage();
  const locale = language === 'pl' ? pl : enUS;
  const [dynamicZoomLink, setDynamicZoomLink] = useState<string | null>(null);
  const [selectedUserTimezone, setSelectedUserTimezone] = useState<string>(getBrowserTimezone());

  // Przygotować dane bezpiecznie (mogą być null)
  const eventStart = event ? new Date(event.start_time) : new Date();
  const eventEnd = event ? new Date(event.end_time) : new Date();
  const eventTimezone = (event as any)?.timezone || DEFAULT_EVENT_TIMEZONE;

  // WSZYSTKIE useMemo PRZED return null
  const userStartTime = useMemo(() => {
    if (!event) return '';
    try {
      return formatInTimeZone(eventStart, selectedUserTimezone, 'HH:mm');
    } catch {
      return format(eventStart, 'HH:mm');
    }
  }, [event, eventStart, selectedUserTimezone]);
  
  const userEndTime = useMemo(() => {
    if (!event) return '';
    try {
      return formatInTimeZone(eventEnd, selectedUserTimezone, 'HH:mm');
    } catch {
      return format(eventEnd, 'HH:mm');
    }
  }, [event, eventEnd, selectedUserTimezone]);
  
  const eventStartTimeFormatted = useMemo(() => {
    if (!event) return '';
    try {
      return formatInTimeZone(eventStart, eventTimezone, 'HH:mm');
    } catch {
      return format(eventStart, 'HH:mm');
    }
  }, [event, eventStart, eventTimezone]);
  
  const eventEndTimeFormatted = useMemo(() => {
    if (!event) return '';
    try {
      return formatInTimeZone(eventEnd, eventTimezone, 'HH:mm');
    } catch {
      return format(eventEnd, 'HH:mm');
    }
  }, [event, eventEnd, eventTimezone]);

  // useEffect też przed return null (już jest)
  useEffect(() => {
    // ... istniejący kod
  }, [event]);

  // TERAZ DOPIERO warunkowy return
  if (!event) return null;

  // Reszta kodu pozostaje bez zmian
  // ...
};
```

**2. Przenieść obliczenia zależne od event:**

Zmienne które używają `event` bezpośrednio (nie w hookach) mogą pozostać po `return null`:
- `durationMinutes`
- `fifteenMinutesBefore`
- `isEnded`, `isLive`, `canJoin`, `showMeetingLink`
- `canCancel`, `occurrenceIndex`
- `effectiveZoomLink`, `isExternalPlatform`

## Szczegółowe zmiany (line-by-line)

| Linia | Zmiana |
|-------|--------|
| 72 | Usunąć `if (!event) return null;` z tego miejsca |
| 74-82 | Przenieść definicje `eventStart`, `eventEnd`, `eventTimezone` PRZED hooki useMemo |
| 85-115 | Dodać `if (!event) return '';` na początku każdego useMemo |
| 116 | Dodać nowe `if (!event) return null;` PO WSZYSTKICH hookach |

## Korzyści

1. **Naprawiony błąd** - hooki zawsze wywoływane w tej samej kolejności
2. **Zgodność z React** - przestrzeganie Rules of Hooks
3. **Stabilność** - dialog nie będzie crashował przy otwieraniu
