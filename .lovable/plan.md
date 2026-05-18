## Cel
Na mobile użytkownik ma móc tapnąć w kraj i mapa ma się przybliżyć tak, aby ten kraj wypełniał całe okienko widżeta (jak Polska na screenie). Obecnie kliknięcia w kraje na mobile są zablokowane.

## Zmiany w `src/components/admin/UserWorldMap.tsx`

1. **`handleCountryClick` — zdjąć blokadę mobile**
   - Usunąć `if (isMobile) return;`.
   - Logika obliczania bounds + zoom pozostaje, ale na mobile użyję ciaśniejszego dopasowania: docelowy zoom = `Math.max(2, Math.min(12, 0.95 / Math.max(w / VIEW_W, h / VIEW_H)))` (na mobile mnożnik `0.95`, na desktopie zostaje `0.9`) — kraj wypełnia kadr widżeta z minimalnym marginesem.
   - Po `setSelectedIso` na mobile od razu wywołać `safeSetView` (bez animacji) plus krótkie `animateTo` 400ms, żeby uniknąć glitchy iOS przy długiej animacji.

2. **SVG path krajów — przywrócić tap na mobile**
   - W `<path>` krajów: `cursor` zostaje `'pointer'` dla wszystkich (mobile + desktop).
   - `onClick` aktywny zawsze: `onClick={() => { if (isClickSuppressed()) return; handleCountryClick(c.raw); }}`.
   - Zachować `WebkitTapHighlightColor: 'transparent'` i `WebkitTouchCallout: 'none'`, żeby nie pojawiał się żółty/szary flash iOS.
   - `isClickSuppressed()` (już istnieje dla gestów pan/pinch) chroni przed przypadkowym kliknięciem podczas gestu.

3. **Reset selekcji**
   - Tap w już zaznaczony kraj nadal odznacza i wraca do `defaultView` (zachowane).
   - Przycisk `RotateCcw` (reset) działa bez zmian.

4. **Bezpieczeństwo renderu (zachowane)**
   - Wszystkie `isFinite` guardy w `safeSetView`/`animateTo` zostają.
   - Clamp zoom do `[MIN_ZOOM, MAX_ZOOM]` zostaje.
   - Brak żółtego fillu krajów w trybie satelitarnym (już naprawione wcześniej).

## Czego NIE zmieniam
- CSS, design tokens, layout widżeta.
- Logika gestów pan/pinch.
- Markery miast (zachowują obecne zachowanie tap → zoom do miasta).
- Backend / RLS / hooks.

## Efekt
Na iOS/Android tap w kraj płynnie przybliża go do rozmiaru kadru widżeta (jak Polska na screenie), bez żółtego zalania i bez utraty stabilności renderu.
