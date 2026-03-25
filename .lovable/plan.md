

# Fix: Podgląd admina = widok uczestnika w czasie rzeczywistym

## Problem
Tryb podglądu (`previewMode`) ignoruje harmonogram i odtwarza pierwszy aktywny film od początku. Powinien pokazywać dokładnie to, co widzą uczestnicy w danym momencie — ten sam film, ten sam offset czasowy.

## Zmiana

### `AutoWebinarEmbed.tsx`
Gdy `previewMode = true`, nie pomijać logiki synchronizacji. Zamiast tego:
- Użyć `currentVideo` i `startOffset` z `useAutoWebinarSync` (tak jak dla zwykłego użytkownika)
- Nie blokować "too late" (bo admin ma prawo oglądać)
- Nie pokazywać welcome message
- Ustawić `isGuest = false` w sync hooku (admin nie podlega late join policy)

Konkretne zmiany:
1. Usunąć logikę `previewMode ? videos.find(v => v.is_active) : currentVideo` — zawsze używać `currentVideo` z sync
2. Usunąć `previewMode ||` z `shouldShowPlayer` — pozwolić sync decydować
3. Zachować pomijanie welcome message i header w preview
4. Jeśli poza godzinami aktywności — pokazać w preview informację "Poza godzinami emisji (start_hour – end_hour). Uczestnicy widzą countdown."

### `useAutoWebinar.ts`
Bez zmian — hook już poprawnie oblicza co powinno być odtwarzane. Preview po prostu przestanie go omijać.

## Pliki
| Plik | Zmiana |
|---|---|
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Usunięcie override'ów previewMode w logice video, zachowanie tylko ukrywania headera/custom section |

