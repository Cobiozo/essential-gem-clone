

# Plan: Powiększenie podglądu obrazu w edytorze

## Problem
Podgląd obrazu w `ImageUploadInput` ma sztywną klasę `h-24` (96px), co przycina zdjęcie — widać tylko wąski pasek zamiast pełnego obrazu.

## Rozwiązanie
Zmienić klasę podglądu z `h-24 object-cover` na `max-h-64 object-contain`, dzięki czemu obraz będzie widoczny w całości (do maks. 256px wysokości), bez przycinania.

### Zmiana w `src/components/partner-page/ImageUploadInput.tsx` (linia 119):
```
// Przed:
<img src={value} alt="Podgląd" className="w-full h-24 object-cover rounded-md border" />

// Po:
<img src={value} alt="Podgląd" className="w-full max-h-64 object-contain rounded-md border bg-muted" />
```

### Pliki do zmian:
| Plik | Zmiana |
|------|--------|
| `ImageUploadInput.tsx` | `h-24 object-cover` → `max-h-64 object-contain bg-muted` |

