

# Plan: Pełne obrazy w edytorze partnera

## Problem
W `PartnerPageInlineEditor.tsx` podgląd obrazów ma `h-20 object-cover`, co przycina zdjęcia — partner nie widzi całego obrazu.

## Rozwiązanie
Zmienić klasę na `max-h-64 object-contain bg-muted` (identycznie jak poprawka w `ImageUploadInput`).

### Zmiana w `src/components/partner-page/PartnerPageInlineEditor.tsx`:
```
// Przed:
<img src={currentValue} alt={label} className="w-full h-20 object-cover rounded border" />

// Po:
<img src={currentValue} alt={label} className="w-full max-h-64 object-contain rounded border bg-muted" />
```

### Pliki do zmian:
| Plik | Zmiana |
|------|--------|
| `PartnerPageInlineEditor.tsx` | `h-20 object-cover` → `max-h-64 object-contain bg-muted` |

