

# Przywrócenie stałego rozmiaru 192px miniaturki

## Problem
Poprzednia zmiana ustawiła `w-full h-48` dla otwartej miniaturki, co rozciąga ją na pełną szerokość. Użytkownik chce zachować stały rozmiar 192px (`w-48 h-48`) po rozwinięciu, ale z układem pionowym (tytuł pod grafiką).

## Zmiana

**Plik: `src/components/events/EventCardCompact.tsx`, linia 613**

Zmienić `w-full h-48` z powrotem na `w-48 h-48`:

```tsx
<div className={`rounded-lg overflow-hidden flex-shrink-0 bg-muted transition-all duration-300 ${isOpen ? 'w-48 h-48' : 'w-20 h-20'}`}>
```

Układ pionowy (`flex-col`) z linii 611 pozostaje — tytuł nadal będzie pod grafiką na mobile.

