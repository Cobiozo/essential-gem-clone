

# Tytuł pod grafikę po rozwinięciu (mobile)

## Problem
Gdy miniaturka rośnie do 192px po rozwinięciu, na telefonie wypycha tytuł poza widoczny obszar — brakuje miejsca w jednym wierszu.

## Rozwiązanie

W `CollapsibleTrigger` zmienić układ z `flex items-center gap-3` na warunkowy:
- **Zamknięte**: obecny układ poziomy (miniaturka + tytuł obok siebie)
- **Otwarte**: układ pionowy — miniaturka na górze, tytuł pod nią

### `src/components/events/EventCardCompact.tsx`

**Linia 611** — zmienić klasę `CollapsibleTrigger`:
```tsx
<CollapsibleTrigger className={`w-full p-3 hover:bg-muted/50 transition-colors rounded-lg ${
  isOpen ? 'flex flex-col items-start gap-3' : 'flex items-center gap-3'
}`}>
```

Miniaturka w trybie otwartym powinna rozciągać się na pełną szerokość zamiast stałych 192px:

**Linia 613** — zmienić rozmiar:
```tsx
<div className={`rounded-lg overflow-hidden flex-shrink-0 bg-muted transition-all duration-300 ${
  isOpen ? 'w-full h-48' : 'w-20 h-20'
}`}>
```

Tytuł i host (linie 628-633) oraz badges/strzałka — bez zmian, naturalnie przepłyną pod grafikę w układzie kolumnowym. Dodać wrapper na cały wiersz z tytułem + badges gdy otwarte:

**Linie 628-633** — owinąć w pełną szerokość gdy otwarte, aby tytuł + badges były w jednym wierszu pod grafiką:
```tsx
<div className={`text-left min-w-0 ${isOpen ? 'w-full' : 'flex-1'}`}>
```

Jeden plik, trzy drobne zmiany klas CSS.

