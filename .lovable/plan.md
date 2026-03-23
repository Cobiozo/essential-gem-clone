

# Naprawa precyzyjnego wskazywania kroków samouczka

## Wykryty bug

Problem leży w **mieszaniu układów współrzędnych** i **złej kolejności operacji scroll/read**:

1. **Mieszanie współrzędnych**: `highlightRect.top` = `rect.top + window.scrollY` (pozycja absolutna na stronie). Ale podświetlenie (highlight border div) jest `absolute` wewnątrz kontenera `fixed` — więc interpretuje `top` jako pozycję **względem viewportu**, nie strony. Maska SVG działa poprawnie (ma `minHeight: scrollHeight`), ale podświetlenie i tooltip — nie.

2. **Stary rect po scrollu**: Gdy `scrollTo: true`, kod najpierw czyta `getBoundingClientRect()`, potem wywołuje `scrollIntoView({ behavior: 'smooth' })`. Po zakończeniu animacji scrollowania element jest w innym miejscu viewportu, ale rect nie jest odświeżany.

## Plan naprawy

### Plik: `src/components/onboarding/TourOverlay.tsx`

**Zmiana 1 — Oddzielne współrzędne dla SVG i highlight:**

Przechowywać dwa zestawy współrzędnych:
- `pageRect` (z scrollY) — dla maski SVG
- `viewportRect` (bez scrollY) — dla highlight div i przekazywany do TourTooltip

**Zmiana 2 — Scroll PRZED odczytem pozycji:**

Gdy `scrollTo: true`:
1. Najpierw wywołaj `scrollIntoView`
2. Poczekaj ~600ms na zakończenie animacji
3. Dopiero potem odczytaj `getBoundingClientRect()` i ustaw highlight

**Zmiana 3 — Aktualizacja po scrollu:**

Dodać nasłuchiwanie na `scroll` event (z debounce), aby highlight podążał za elementem gdy użytkownik sam scrolluje stronę.

### Plik: `src/components/onboarding/TourTooltip.tsx`

Tooltip już używa `hlRect.top - window.scrollY` do obliczania pozycji viewportowej — to jest poprawne **tylko gdy** `hlRect.top` zawiera scrollY. Po naprawie, tooltip otrzyma bezpośrednio viewport coordinates, więc trzeba usunąć odejmowanie `window.scrollY` w `calcPosition` i `isOverlapping`.

## Szczegóły techniczne

```text
PRZED (bug):
  rect = getBoundingClientRect()        ← viewport Y=1200
  highlightRect.top = 1200 + scrollY(0) = 1200
  scrollIntoView()                      ← scroll do 800
  Element teraz na viewport Y=400, ale highlightRect.top wciąż = 1200
  Highlight div (fixed) rysuje się na Y=1200 ← ZŁE

PO (fix):
  scrollIntoView()                      ← scroll do 800
  [czekaj 600ms]
  rect = getBoundingClientRect()        ← viewport Y=400
  viewportRect.top = 400                ← dla highlight div
  pageRect.top = 400 + 800 = 1200      ← dla SVG mask
  Highlight div (fixed) na Y=400       ← DOBRZE
```

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/onboarding/TourOverlay.tsx` | Scroll-first, dual coordinates, scroll listener |
| `src/components/onboarding/TourTooltip.tsx` | Usunięcie `- window.scrollY` (dostaje viewport coords) |

