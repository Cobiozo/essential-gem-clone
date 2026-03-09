

# Powiększenie miniaturki po rozwinięciu karty

## Problem
Dodano oddzielną dużą grafikę w rozwiniętej sekcji, a użytkownik chciał efektu powiększenia istniejącej miniaturki (80x80px → większa) po rozwinięciu karty.

## Rozwiązanie

### `src/components/events/EventCardCompact.tsx`

1. **Usunąć** dodatkowy blok "Expanded image preview" (linie 685-694)
2. **Powiększyć miniaturkę** w nagłówku gdy karta jest otwarta — zmienić rozmiar z `w-20 h-20` na `w-32 h-32` (128px) z płynną animacją `transition-all duration-300`:

```tsx
<div className={`rounded-lg overflow-hidden flex-shrink-0 bg-muted transition-all duration-300 ${isOpen ? 'w-32 h-32' : 'w-20 h-20'}`}>
```

Miniaturka będzie płynnie rosła/malała przy otwieraniu/zamykaniu karty, bez dodatkowego elementu graficznego.

