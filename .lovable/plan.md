## Problem

Na iOS w PWA, po jednym tapnięciu w mapę w widgecie dashboardu (`UserWorldMap`), cała mapa zmienia się w jednolitą żółtą plamę (kolor `--primary`). Z screenshotu widać, że wszystkie kraje (Europa, Afryka, Azja) są wypełnione żółtym, mimo trybu "Klasyczna". Markery i granice oceanów są nadal widoczne, ale ląd jest cały primary-yellow.

## Diagnoza (najbardziej prawdopodobne źródło)

W `src/components/admin/UserWorldMap.tsx` w `handleCountryClick`:

```ts
const b = pathGen.bounds(f);
const cx = (b[0][0] + b[1][0]) / 2;
...
const z = Math.max(1.5, Math.min(40, 0.9 / Math.max(w / VIEW_W, h / VIEW_H)));
animateTo({ cx, cy, zoom: z }, 700);
```

Na iOS przy tapnięciu w drobny kraj / wyspę / kraj z geometrią przecinającą antymeridian `pathGen.bounds(f)` zwraca `Infinity`/`NaN`, a `z` puszcza się do `40`. `setView` dostaje wartości `NaN` → `viewBox` jest niepoprawny → przeglądarka iOS renderuje SVG bez transformacji viewport, przez co duży obszar wypełniony jest paletą `fill` jednego elementu (lub wszystkie kraje rysują się skumulowane). Dodatkowo iOS Safari pokazuje `-webkit-tap-highlight-color` na `<path>`, a w niektórych konfiguracjach trzyma `:active` aż do następnego pointer eventa, co potęguje efekt żółtej plamy.

Drugi powód: `setSelectedIso` po tapnięciu w nierozpoznany kraj zostaje pustym/dziwnym stringiem, przez co warunek `c.iso === selectedIso` daje true dla wszystkich `null`/pustych iso → wszystkie kraje są malowane jako "selected".

## Plan naprawy

Zmiany tylko w `src/components/admin/UserWorldMap.tsx`:

1. **Walidacja `handleCountryClick`:**
   - Wczesny return jeśli `pathGen.bounds(f)` zwraca dowolny `NaN`/`Infinity`/`±1e308`.
   - Sanity-check `cx`, `cy`, `z` przed `animateTo`.
   - `z` ograniczony do max `8` (zamiast `40`) — pojedynczy tap nie ma prawa zoomować tak głęboko, żeby jeden kraj wypełnił cały kadr.

2. **Walidacja `animateTo` i `setView`:**
   - Owinąć `setView(...)` w guard: jeśli `cx/cy/zoom` nie są skończonymi liczbami, ignorować klatkę i nie aktualizować stanu (chroni viewBox przed `NaN`).
   - Clamp `zoom` do `[MIN_ZOOM, MAX_ZOOM]`, a `cx/cy` do `[-VIEW_W*2, VIEW_W*3]` / podobnie dla Y.

3. **Walidacja `selectedIso`:**
   - Ustawiać `selectedIso` tylko jeśli `norm.iso` to niepusty string (już jest `if (!norm.iso) return;`, ale dodatkowo: jeśli żaden inny kraj nie ma tego iso, lepiej traktować jako brak selekcji).
   - W `isSelected`/`dimmed` jawnie wymagać `c.iso != null && selectedIso != null && c.iso === selectedIso`.

4. **iOS tap fixes:**
   - Na SVG i na każdym `<path>` ustawić inline: `WebkitTapHighlightColor: 'transparent'`, `WebkitTouchCallout: 'none'`.
   - Wyłączyć aktywację koloru przez `:active` przez `style={{ pointerEvents: 'auto', outline: 'none' }}` oraz `tabIndex={-1}`.

5. **Mobile UX guard:**
   - Na `isMobile`: tapnięcie w kraj NIE wywołuje `setSelectedIso` ani zoomu — tylko marker/cluster reaguje na tap. Click krajów działa tylko na desktop. Dzięki temu przypadkowy tap na ląd nie potrafi sprowokować błędu wizualnego.

6. **Sanity render guard:**
   - Jeśli `vbX/vbY/vbW/vbH` zawierają `NaN`, fallback do `defaultView` zamiast pchać do SVG niepoprawny atrybut `viewBox`.

## Plik objęty zmianami

- `src/components/admin/UserWorldMap.tsx`

Bez zmian w bazie, bez zmian w innych komponentach.

## Weryfikacja

Po wdrożeniu otworzę preview na viewporcie 390x844 (iPhone), wejdę na `/dashboard`, tapnę w mapę w 3 różnych miejscach (lądowo i w wodzie) i sprawdzę:
- mapa pozostaje stabilna,
- żaden tap nie zmienia całej mapy w żółty,
- markery i pinch‑zoom dalej działają,
- konsola bez błędów `NaN` w atrybucie `viewBox`.
