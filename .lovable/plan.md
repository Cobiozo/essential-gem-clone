

# Naprawa scrollowania dialogu edycji komunikatu

## Problem
Dialog edycji jest za wysoki na ekran — brakuje scrollowania, więc dolne opcje (widoczność, daty) są niedostępne.

## Rozwiązanie

### Plik: `src/components/admin/NewsTickerManagement.tsx` (linia 1157)

Dodać `max-h-[85vh] overflow-y-auto` do `DialogContent`:

```tsx
<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
```

Jedna zmiana, jedna linia — dialog będzie scrollowalny.

