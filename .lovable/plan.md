

# Zamiana "+N" na dodatkowy rząd kropek nad cyfrą daty

## Problem
Nad datą 12 pojawia się "+1" zamiast kropki. Użytkownik chce, aby zamiast liczby overflow wyświetlały się kolejne kropki — do 4 na dole i do 4 na górze (łącznie max 8 kropek).

## Zmiana

**Plik:** `src/components/dashboard/widgets/CalendarWidget.tsx`

Linie 407–444 — zamienić logikę overflow:

- `bottomDots` = pierwsze 4 wydarzenia (kropki na dole)
- `topDots` = kolejne max 4 wydarzenia (kropki na górze, nad cyfrą)
- Usunąć `overflowCount` i tekst `+N`
- Zamiast `<span>+{overflowCount}</span>` wstawić analogiczny `<div className="absolute top-0.5 flex gap-0.5">` z kropkami z `topDots`

```typescript
const bottomDots = dayEvents.slice(0, 4);
const topDots = dayEvents.slice(4, 8);
```

Górny rząd kropek:
```tsx
{topDots.length > 0 && (
  <div className="absolute top-0.5 flex gap-0.5">
    {topDots.map((event, i) => (
      <div
        key={i}
        className={cn("w-1.5 h-1.5 rounded-full", getEventColor(event.event_type))}
      />
    ))}
  </div>
)}
```

Jedna sekcja do zmiany, ~10 linii.

