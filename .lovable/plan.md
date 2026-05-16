## Cel
Trzy zmiany w `src/components/admin/UserWorldMap.tsx` (tylko ten plik — bez zmian w logice biznesowej, edge functions ani danych):

1. **Precyzyjne wskazywanie kropki** — obecnie niewidoczna warstwa `r * 2.5` z `fillOpacity={0}` rozszerza hitbox 2,5× poza widoczną kropkę, więc tooltip pojawia się daleko od kropeczki.
2. **Mniejsze kropki przy dużym przybliżeniu** — obecny wzór skaluje się słabo (`pow(zoom, 0.7)`) i ma sztywne minimum `0.5`/maks `3.2`, przez co przy zoomie 20+ kropki są wciąż wielkie.
3. **Większy zoom aż do konturu miasta** — obecny `maxZoom=64` jest OK, ale `handleZoomIn`/`zoomToCluster` mają cap 64; podniesiemy do 200 i poprawimy próg pojawiania się konturów oraz auto-zoom przy kliknięciu pojedynczej kropki.

## Zakres zmian (jeden plik)

### A. Hitbox = widoczna kropka (precyzyjny hover)
- Usunąć zewnętrzny `<circle r={r*2.5} fillOpacity={0}>`.
- Na widocznej kropce dodać `pointerEvents="all"` — hover/click tylko po realnym pikselu.
- Efekt: tooltip wyłącznie gdy kursor jest faktycznie na kropce.

### B. Skalowanie kropki silniej zależne od zoomu
- Nowy wzór: `rawR = (1.0 + log2(count + 1) * 0.6) / pow(zoom, 0.95)`.
- Nowe granice: `min 0.15`, `max 3.0`. Przy zoom ≈ 20 kropka ma ~0.3–0.5 (zamiast 0.5–1.2 dziś), przy zoom 60 jest praktycznie punktem.
- `strokeWidth` analogicznie: `0.35 / pow(zoom, 0.9)`.
- Legenda używa nadal stałych rozmiarów (referencyjnych) — bez zmian.

### C. Mocniejszy zoom + wcześniejsze kontury miast
- `ZoomableGroup maxZoom` 64 → **200**.
- `handleZoomIn`: cap `64` → `200`; mnożnik `1.8` → `2.0`.
- `zoomToCluster`: cap `64` → `200`.
- Pojedyncza kropka (`!isCluster`) po kliknięciu robi `animateTo({coordinates:[lng,lat], zoom: max(position.zoom*2.2, 40)}, 600)` — wjeżdża aż do poziomu konturu miasta.
- `boundariesEnabled`: próg `zoom >= 8` → `zoom >= 6` (kontury pobierane wcześniej).
- `boundaryOpacity`: `(zoom - 7) / 3` → `(zoom - 5) / 3` (płynniejsze ujawnianie).
- Wewnętrzny scroll-zoom `react-simple-maps` honoruje `maxZoom` z `ZoomableGroup`, więc cap działa też dla scrolla.

## Bezpieczeństwo / brak regresji
- Żadnych zmian w: queries, edge functions (`geocode-cities`, `geocode-city-boundary`), cache, polling cap (30 prób), kluczach query, store'ach, RLS, schemacie.
- Brak zmian w klastrowaniu, w `handleGeographyClick`, w obsłudze `selectedIso`, w eksportach CSV/XLSX, w innych komponentach panelu statystyk.
- Brak nowych zależności.
- `animateTo` używa już `Math.log/exp` — duże skoki zoomu są płynne.
- Polling konturów nie rośnie: `boundaryItems` nadal `slice(0,40)`, `staleTime 24h`, brak `refetchInterval`. Niższy próg `6` jedynie wcześniej startuje cache'owane zapytanie, nie pętli.

## Techniczne detale (skrócone)

```tsx
// B – rozmiar kropki
const rawR = (1.0 + Math.log2(c.count + 1) * 0.6) / Math.pow(position.zoom, 0.95);
const r = Math.max(0.15, Math.min(3.0, rawR));
const strokeW = 0.35 / Math.pow(position.zoom, 0.9);

// A – jeden circle, hitbox = piksel
<circle
  r={r}
  fill="hsl(var(--primary))"
  fillOpacity={isCluster ? 0.85 : 1}
  stroke="hsl(var(--background))"
  strokeWidth={strokeW}
  pointerEvents="all"
/>

// C – większy zoom
<ZoomableGroup ... maxZoom={200}>
const handleZoomIn = () => animateTo({ ..., zoom: Math.min(position.zoom * 2.0, 200) }, 280);
const zoomToCluster = (lng, lat) => animateTo({ coordinates:[lng,lat], zoom: Math.min(position.zoom*2.2, 200)}, 600);
// klik na pojedynczą kropkę:
onClick={() => isCluster
  ? zoomToCluster(c.lng, c.lat)
  : animateTo({ coordinates:[c.lng, c.lat], zoom: Math.max(position.zoom*2.2, 40) }, 600)}

const boundariesEnabled = position.zoom >= 6 && visiblePoints.length > 0;
const boundaryOpacity = Math.max(0, Math.min(1, (position.zoom - 5) / 3));
```

## Weryfikacja
- Build (auto).
- Wizualnie w preview: hover tylko na kropce, kropki maleją przy zoom 20/40/80, kontur miasta widoczny przy ~zoom 8–12.
