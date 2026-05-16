## Cel
- Przywrócić czytelny wygląd mapy: małe kropki bez cyfr, widoczne kontury państw.
- Dodać płynną animację przejścia kamery (center + zoom) przy auto-zoom do wybranego kraju i przy klastrach.

## Zmiany w `src/components/admin/UserWorldMap.tsx`

### 1) Wygląd geografii — wyraźniejsze kontury
- Tło lądów lżejsze, kontury wyraźniejsze, niezależnie od zaznaczenia:
  - `fill: 'hsl(var(--muted) / 0.55)'` (zwykły), `'hsl(var(--muted) / 0.35)'` (dimmed), `'hsl(var(--primary) / 0.18)'` (selected)
  - `stroke: 'hsl(var(--border))'` zwykły, `'hsl(var(--primary))'` selected
  - `strokeWidth: 0.7` zwykły, `1.2` selected
- Hover: lekkie podświetlenie tylko gdy `iso` istnieje.

### 2) Markery — małe kropeczki, bez cyfr
- Usunąć rendering `<text>` z liczbą w klastrach.
- Skala promienia mała i jednolita:
  - `r = (1.6 + Math.log2(count + 1) * 0.9) / Math.sqrt(zoom)` z klampem `[0.6, 5]`
  - `strokeWidth = 0.6 / Math.sqrt(zoom)`
- Klaster vs single — różnica tylko w opacity (0.9 vs 0.75), bez powiększenia ani liczby.
- Tooltip pozostaje (pokazuje miasta + liczbę użytkowników), więc info nie znika — schodzi tylko z grafiki.

### 3) Płynna animacja kamery
- Dodać stan `animRef` (requestAnimationFrame) i funkcję `animateTo(target: {coordinates,zoom}, duration=700)`:
  - Easing `easeInOutCubic`.
  - Interpolacja liniowa `coordinates` i `zoom` (logarytmiczna dla zoom: `exp(lerp(log(z0), log(z1), t))` dla naturalnego efektu).
  - W każdym kroku `setPosition({...})`; anulowanie poprzedniej animacji przy nowej (cancelAnimationFrame).
- Użycie:
  - `handleGeographyClick` → zamiast `setPosition(...)` woła `animateTo({coordinates, zoom})`.
  - `zoomToCluster` → `animateTo({coordinates:[lng,lat], zoom: min(zoom*2.2, 64)})`.
  - `handleZoomIn/Out` → opcjonalnie też animowane (krótkie 250 ms).
  - `handleReset` → `animateTo({coordinates:[10,25], zoom:1}, 500)` + czyszczenie filtra.
- `onMoveEnd` z `ZoomableGroup` ustawia stan tylko gdy nie trwa animacja (flag `isAnimatingRef`) — żeby nie nadpisać klatek.

### 4) Legenda
- Przeliczyć promienie wg nowej formuły, by były spójne z mapą.

## Bez zmian
- Klastrowanie (grid), filtr po kraju, geokodowanie, hook query, tooltip content.

## Pliki
- `src/components/admin/UserWorldMap.tsx` — jedyna modyfikacja.
