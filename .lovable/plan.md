## Problem

Tekstura satelitarna wyświetla się jako miniatura w lewym górnym rogu, bo `<image x={-180} y={-90} width={360} height={180}>` to **surowe koordynaty SVG**, a wektorowa mapa (kraje) jest rysowana w **projektowanych pikselach** — przy `geoEquirectangular().scale(160)` świat zajmuje ok. 1005×502 px wokół środka (400,300), więc obrazek 360×180 px to drobny fragment środka.

## Fix (jeden plik: `src/components/admin/UserWorldMap.tsx`)

Wyliczyć rzeczywiste piksele rogów świata przez tę samą projekcję, której używa `ComposableMap`, i wstawić `<image>` w tych koordynatach.

### Kroki

1. Import: `import { geoEquirectangular } from 'd3-geo';` (paczka już jest w drzewie zależności `react-simple-maps`).
2. `useMemo` liczy bounds dla bieżącej projekcji satelitarnej:
   ```ts
   const satBounds = useMemo(() => {
     const proj = geoEquirectangular().scale(160).translate([400, 300]);
     const tl = proj([-180, 90])!;
     const br = proj([180, -90])!;
     return { x: tl[0], y: tl[1], w: br[0] - tl[0], h: br[1] - tl[1] };
   }, []);
   ```
3. W `<ZoomableGroup>` w trybie `satellite`:
   ```tsx
   <image
     href="/textures/earth-bluemarble-2k.jpg"
     x={satBounds.x}
     y={satBounds.y}
     width={satBounds.w}
     height={satBounds.h}
     preserveAspectRatio="none"
     style={{ pointerEvents: 'none' }}
   />
   ```

To **dokładnie** pokrywa się z poligonami krajów (ta sama projekcja, ten sam scale=160, ten sam translate domyślny `ComposableMap` 800×600 → (400,300)). Dzięki temu kropki Warszawy, Krakowa itd. lądują we właściwych pikselach.

### Brak regresji

- Klasyczny tryb (`geoNaturalEarth1`) bez zmian — `<image>` renderowane tylko w trybie satelitarnym.
- Bez zmian w queries, edge functions, polling, RLS, klastrach, hover, zoom (200), eksportach.
- Brak nowych zależności (`d3-geo` już zainstalowane jako transitive dep).

### Weryfikacja

Wizualnie w `/admin?tab=user-stats` → tryb „Satelitarna": tekstura wypełnia cały obszar mapy, kropki użytkowników nadal w prawidłowych miastach, granice krajów (białe linie) leżą idealnie na lądach na obrazku.
