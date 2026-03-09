

# Większa grafika po rozwinięciu karty wydarzenia

## Problem
Po rozwinięciu karty webinaru/spotkania grafika pozostaje w rozmiarze miniaturki (80x80px) z nagłówka. Brak większego podglądu obrazu w rozwiniętej sekcji — treść opisu zaczyna się bezpośrednio, bez kontekstu wizualnego.

## Rozwiązanie
Dodać większą wersję grafiki w rozwiniętej sekcji (`CollapsibleContent`), zaraz po dacie mobilnej, a przed opisem. Grafika będzie wyświetlana w pełnej szerokości z zaokrąglonymi rogami i ograniczoną maksymalną wysokością.

### `src/components/events/EventCardCompact.tsx`

Po sekcji "Mobile date/time" (linia 683), przed "External platform banner" (linia 686), dodać blok z większą grafiką:

```tsx
{/* Expanded image */}
{event.image_url && (
  <div className="w-full max-h-64 rounded-lg overflow-hidden bg-muted">
    <img
      src={event.image_url}
      alt={event.title}
      className="w-full h-full object-cover max-h-64"
    />
  </div>
)}
```

Grafika zajmie pełną szerokość karty, z `max-h-64` (256px) jako ograniczeniem wysokości i `object-cover` dla zachowania proporcji.

### Pliki do edycji:
- `src/components/events/EventCardCompact.tsx` — dodanie większej grafiki w rozwiniętej sekcji

