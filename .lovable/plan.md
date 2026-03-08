

# Fix: Dzisiejszy dzień niewidoczny w trybie ciemnym

## Problem

8 marca 2026 to niedziela. Komórka kalendarza dostaje klasy weekendowe (`dark:bg-muted/20`) ORAZ klasy "dziś" (`bg-accent text-accent-foreground`). W dark mode `dark:bg-muted/20` ma wyższy priorytet CSS niż `bg-accent`, więc tło jest ciemne, a tekst (`accent-foreground: hsl(0 0% 10%)`) — prawie czarny. Efekt: niewidoczna liczba.

## Rozwiązanie

W `CalendarWidget.tsx` linia 404 — dodać `dark:bg-accent` i `dark:text-accent-foreground` aby nadpisać wariant weekendowy w ciemnym motywie:

```tsx
// Linia 404, zmiana z:
today && "bg-accent text-accent-foreground font-semibold",

// Na:
today && "bg-accent dark:bg-accent text-accent-foreground dark:text-accent-foreground font-semibold",
```

Jedna linia, zero ryzyka regresji.

