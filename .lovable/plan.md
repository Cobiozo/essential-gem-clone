
# Plan: Ukrycie przycisku "Zaproś" gdy opcja jest wyłączona przez admina

## Problem

Przycisk "Zaproś Gościa" (ikona UserPlus) w CalendarWidget pokazuje się dla wszystkich webinarów, nawet gdy administrator wyłączył opcję "Zezwól na zapraszanie gości" (`allow_invites = false`).

**Stan obecny (linie 400-413):**
```tsx
{event.event_type === 'webinar' && !isPast(new Date(event.end_time)) && (
  <Button ...>
    <UserPlus className="h-3 w-3" />
  </Button>
)}
```

**Oczekiwany warunek (jak w EventCardCompact):**
```tsx
{event.event_type === 'webinar' && !isPast(new Date(event.end_time)) && (event as any).allow_invites === true && (
  <Button ...>
    <UserPlus className="h-3 w-3" />
  </Button>
)}
```

---

## Rozwiązanie

Dodanie sprawdzenia flagi `allow_invites` przed wyświetleniem przycisku zaproszenia.

---

## Zmiana w pliku `src/components/dashboard/widgets/CalendarWidget.tsx`

### Linie 400-413 - Dodanie warunku `allow_invites === true`

**Przed:**
```tsx
{event.event_type === 'webinar' && !isPast(new Date(event.end_time)) && (
  <Button
    size="sm"
    variant="ghost"
    className="h-6 px-2"
    onClick={(e) => {
      e.stopPropagation();
      handleCopyInvitation(event);
    }}
    title="Zaproś Gościa"
  >
    <UserPlus className="h-3 w-3" />
  </Button>
)}
```

**Po:**
```tsx
{event.event_type === 'webinar' && !isPast(new Date(event.end_time)) && (event as any).allow_invites === true && (
  <Button
    size="sm"
    variant="ghost"
    className="h-6 px-2"
    onClick={(e) => {
      e.stopPropagation();
      handleCopyInvitation(event);
    }}
    title="Zaproś Gościa"
  >
    <UserPlus className="h-3 w-3" />
  </Button>
)}
```

---

## Podsumowanie

| Plik | Zmiana |
|------|--------|
| `CalendarWidget.tsx` | Dodanie warunku `(event as any).allow_invites === true` do przycisku UserPlus |

## Oczekiwany rezultat

- Gdy admin **włączy** "Zezwól na zapraszanie gości" - przycisk UserPlus będzie widoczny
- Gdy admin **wyłączy** "Zezwól na zapraszanie gości" - przycisk UserPlus **nie pojawi się** w widżecie kalendarza

Zachowanie będzie identyczne jak w komponentach `EventCardCompact` i `EventCard`.
