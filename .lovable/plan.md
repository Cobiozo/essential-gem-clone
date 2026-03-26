

# Podgląd admina zawsze dostępny + edycja slugu i linku zaproszeniowego

## Problem
1. **Podgląd**: Gdy admin otwiera podgląd poza godzinami emisji, widzi "Poza godzinami emisji" zamiast odtwarzacza. Podgląd powinien zawsze odtwarzać pierwszy aktywny film gdy system jest włączony i mieści się w godzinach emisji.
2. **Slug**: Admin nie może edytować slugu wydarzenia — jest generowany automatycznie i tylko do odczytu. Nie ma też możliwości budowania pełnego linku zaproszeniowego.

## Rozwiązanie

### 1. Podgląd admina — zawsze odtwarza w godzinach emisji

Plik: `src/hooks/useAutoWebinarSync.ts`

W sekcji "LOGGED-IN USER" (linia ~266), gdy `previewMode` jest aktywny, pominąć logikę slotów i zawsze ustawić pierwszy aktywny film z `startOffset = 0`. Wymaga dodania parametru `previewMode` do hooka `useAutoWebinarSync`.

- Dodać opcjonalny parametr `previewMode?: boolean` do `useAutoWebinarSync`
- Na początku `calculate()`: jeśli `previewMode === true`, ustawić `currentVideo = activeVideos[0]`, `startOffset = 0`, `isInActiveHours = true` i zwrócić — bez sprawdzania slotów/godzin
- W `AutoWebinarEmbed.tsx` (linia ~28): przekazać `previewMode` do `useAutoWebinarSync`

Plik: `src/components/auto-webinar/AutoWebinarEmbed.tsx`
- Zmienić wywołanie: `useAutoWebinarSync(videos, config, isGuest, guestSlotTime, previewMode)`

### 2. Edytowalny slug i link zaproszeniowy

Plik: `src/components/admin/AutoWebinarManagement.tsx`

W sekcji "Wydarzenie i zaproszenia" (linia ~1324-1350):
- Zmienić pole `Input` ze slugu z `readOnly` na edytowalne
- Dodać stan `editSlug` i przycisk "Zapisz slug"
- Dodać pole do edycji bazowego URL linku zaproszeniowego (domyślnie `https://purelife.info.pl/e/`)
- Po zapisie slugu: `UPDATE events SET slug = newSlug WHERE id = linkedEvent.id`
- Wyświetlać podgląd pełnego linku w czasie rzeczywistym

Dodać też pole konfiguracyjne `invitation_base_url` do konfiguracji, aby admin mógł zdefiniować bazowy URL (np. `https://purelife.info.pl/e/` lub inna domena).

### Pliki do edycji
| Plik | Zmiana |
|---|---|
| `src/hooks/useAutoWebinarSync.ts` | Dodać parametr `previewMode`, bypass logiki slotów |
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Przekazać `previewMode` do hooka sync |
| `src/components/admin/AutoWebinarManagement.tsx` | Edytowalny slug + budowanie linku zaproszeniowego |

