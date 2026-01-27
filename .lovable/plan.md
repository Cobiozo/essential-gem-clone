

# Plan: Ujednolicenie przycisków w CalendarWidget

## Problem

Pod kalendarzem przyciski różnią się od tych w widoku Webinary:

| Widok Webinary | Widok Kalendarz (obecnie) |
|----------------|--------------------------|
| "📅 Dodaj do kalendarza" (dla zewn.) | "Zapisz się" |
| "Usuń z kalendarza" (po zapisaniu zewn.) | Badge "Jesteś zapisany" |
| "Wypisz się" (po zapisaniu normalne) | Badge "Jesteś zapisany" |
| Custom buttons (np. "Przejdź i Zapisz się w EQApp") | Brak |

## Rozwiązanie

Przepisanie logiki w `CalendarWidget.tsx` aby była identyczna z `EventCardCompact.tsx`.

---

## Zmiany w pliku `src/components/dashboard/widgets/CalendarWidget.tsx`

### 1. Dodanie importu X

```tsx
import { Calendar, ChevronLeft, ChevronRight, Video, Users, User, ExternalLink, UserPlus, CalendarDays, Info, X } from 'lucide-react';
```

### 2. Import typu EventButton

```tsx
import type { EventWithRegistration, EventButton } from '@/types/events';
```

### 3. Nowa funkcja getRegistrationButton

**Logika:**

| Stan | Zewnętrzna platforma | Normalne wydarzenie |
|------|---------------------|---------------------|
| Niezarejestrowany | "📅 Dodaj do kalendarza" (outline) | "Zapisz się" (outline) |
| Zarejestrowany | "Usuń z kalendarza" (secondary) | "Wypisz się" (secondary) |
| Można dołączyć | "WEJDŹ" (emerald) | "WEJDŹ" (emerald) |
| Zakończone | Badge "Zakończone" | Badge "Zakończone" |

### 4. Dodanie renderowania custom buttons

Custom buttons (np. "Przejdź i Zapisz się w EQApp") będą wyświetlane zawsze - przed i po zapisaniu.

---

## Nowa logika getRegistrationButton

```tsx
const getRegistrationButton = (event: EventWithRegistration) => {
  const now = new Date();
  const eventStart = new Date(event.start_time);
  const eventEnd = new Date(event.end_time);
  const fifteenMinutesBefore = subMinutes(eventStart, 15);
  const occurrenceIndex = (event as any)._occurrence_index as number | undefined;
  const isExternalPlatform = (event as any).is_external_platform === true;
  
  // Wydarzenie zakończone
  if (isAfter(now, eventEnd)) {
    return <Badge variant="secondary" className="text-xs">Zakończone</Badge>;
  }
  
  // Można dołączyć (15 min przed lub trwa)
  if (event.is_registered && isAfter(now, fifteenMinutesBefore) && isBefore(now, eventEnd)) {
    if (event.zoom_link) {
      return (
        <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700" asChild>
          <a href={event.zoom_link} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3 mr-1" />
            WEJDŹ
          </a>
        </Button>
      );
    }
    return <Badge className="text-xs bg-emerald-600">Trwa teraz</Badge>;
  }
  
  // Zarejestrowany
  if (event.is_registered) {
    if (isExternalPlatform) {
      // Zewnętrzna platforma - "Usuń z kalendarza"
      return (
        <Button
          size="sm"
          variant="secondary"
          className="h-6 text-xs"
          onClick={() => cancelRegistration(event.id, occurrenceIndex)}
        >
          <X className="h-3 w-3 mr-1" />
          Usuń z kalendarza
        </Button>
      );
    }
    // Normalne wydarzenie - "Wypisz się"
    return (
      <Button
        size="sm"
        variant="secondary"
        className="h-6 text-xs"
        onClick={() => cancelRegistration(event.id, occurrenceIndex)}
      >
        <X className="h-3 w-3 mr-1" />
        Wypisz się
      </Button>
    );
  }
  
  // Niezarejestrowany
  if (isExternalPlatform) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-6 text-xs"
        onClick={() => registerForEvent(event.id, occurrenceIndex)}
      >
        <Calendar className="h-3 w-3 mr-1" />
        Dodaj do kalendarza
      </Button>
    );
  }
  
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-6 text-xs"
      onClick={() => registerForEvent(event.id, occurrenceIndex)}
    >
      {t('events.registerButton') || 'Zapisz się'}
    </Button>
  );
};
```

---

## Renderowanie custom buttons w liście wydarzeń

W sekcji wydarzeń pod kalendarzem, dodanie przed przyciskiem rejestracji:

```tsx
{/* Custom action buttons - zawsze widoczne */}
{event.buttons && event.buttons.length > 0 && (
  <div className="flex flex-wrap gap-1">
    {event.buttons.map((btn: EventButton, index: number) => {
      const variant = btn.style === 'primary' ? 'default' : 
                      btn.style === 'secondary' ? 'secondary' : 'outline';
      return (
        <Button
          key={`btn-${index}`}
          variant={variant}
          size="sm"
          className="h-6 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            window.open(btn.url, '_blank');
          }}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          {btn.label}
        </Button>
      );
    })}
  </div>
)}
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `CalendarWidget.tsx` | Import X, EventButton; przepisanie getRegistrationButton; dodanie custom buttons |

## Oczekiwany rezultat

**Przed zapisaniem (zewnętrzna platforma):**
- Przycisk "📅 Dodaj do kalendarza" (outline)
- Custom button "Przejdź i Zapisz się w EQApp" (primary)
- Przycisk "Szczegóły"

**Po zapisaniu (zewnętrzna platforma):**
- Przycisk "Usuń z kalendarza" (secondary z X)
- Custom button "Przejdź i Zapisz się w EQApp" (primary) - ZAWSZE widoczny
- Przycisk "Szczegóły"

**Dla normalnych wydarzeń:**
- Przed: "Zapisz się" (outline)
- Po: "Wypisz się" (secondary z X)

