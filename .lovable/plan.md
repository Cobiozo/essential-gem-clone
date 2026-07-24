## Cel
Zastąpić obecną mapę SVG (d3-geo + world-atlas) w widżecie „Nasi użytkownicy PLC" prawdziwą mapą **Leaflet** z **klasteryzacją markerów** (Leaflet.markercluster). Wygląd karty (tytuł, toggle Klasyczna/Satelitarna, logo, wysokość, kolor markera) pozostaje 1:1.

## Zakres zmian

### 1. Zależności
- `leaflet` + `@types/leaflet`
- `leaflet.markercluster` + `@types/leaflet.markercluster`

(bez `react-leaflet` — używamy Leaflet imperatywnie w `useEffect`, to prostsze i lżejsze; dopasowuje się do istniejącego stylu komponentu).

### 2. Przepisanie `src/components/admin/UserWorldMap.tsx`
- Zachowany interfejs propsów: `cities`, `initialMode` ('classic'|'satellite'), `markerColor`, `showLogos`, `showTitle`, `customTitle`, `heightPx`, `hideHeaderMeta`, `logoLeftUrl`, `logoRightUrl`.
- Kontener `<div ref={mapRef}>` o wysokości `heightPx`, inicjalizacja `L.map()` w `useEffect`.
- Dwie warstwy kafli przełączane toggle'em (bez zmian wizualnych paska):
  - **Klasyczna** — OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, attribution © OpenStreetMap).
  - **Satelitarna** — Esri World Imagery (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`, attribution Esri).
- Warstwa `L.markerClusterGroup()` z pojedynczymi markerami `L.circleMarker` (kolor = `markerColor`, promień skalowany od `count`: 6–14 px, `weight:1`, `fillOpacity:0.85`).
- Popup markera: miasto, kraj z flagą (`normalizeCountry` + emoji z `countryFlags`), liczba użytkowników.
- Ikona klastra: własna via `iconCreateFunction` → `L.divIcon` w kolorze `markerColor` z sumą `count` wewnątrz (progi rozmiaru: <10 = 30px, <50 = 38px, ≥50 = 46px).
- Fit bounds do wszystkich punktów przy pierwszym renderze; jeśli brak — widok domyślny Europa (`[52, 15], zoom 4`).
- Reset view (przycisk `RotateCcw`) — re-fit do bounds. Zoom +/- używają natywnych `map.zoomIn/Out`; ukrywamy domyślny `zoomControl` i renderujemy własne przyciski w tym samym stylu co teraz (żeby wygląd narożników nie uległ zmianie).
- Cleanup: `map.remove()` w return `useEffect`.

### 3. Geokodowanie (bez zmian logiki biznesowej)
- Zachować obecny pipeline: `localStorage` cache (`userWorldMap.geocodeCache.v1`) + edge function `geocode-cities` dla brakujących punktów.
- Po otrzymaniu wyników — update markerów w klasterze (`clusterGroup.clearLayers()` + `addLayers`).

### 4. Style
- Import w komponencie:
  - `leaflet/dist/leaflet.css`
  - `leaflet.markercluster/dist/MarkerCluster.css`
  - `leaflet.markercluster/dist/MarkerCluster.Default.css`
- Nadpisania w `src/index.css` pod ciemny motyw karty:
  - `.leaflet-container { background: transparent; }`
  - `.leaflet-popup-content-wrapper, .leaflet-popup-tip` → tło `hsl(var(--card))`, tekst `hsl(var(--card-foreground))`, `border: 1px solid hsl(var(--border))`, `border-radius: var(--radius)`.
  - `.leaflet-control-attribution` → półprzezroczyste, mały tekst, dopasowane do ciemnego tła.
  - Klaster: `.pl-cluster { color:#fff; font-weight:600; display:flex; align-items:center; justify-content:center; border-radius:9999px; box-shadow:0 0 0 4px color-mix(in oklab, var(--pl-marker) 40%, transparent); background: var(--pl-marker); }` — `--pl-marker` ustawiane inline z propa `markerColor`.

### 5. Integracja
- `src/components/dashboard/widgets/UserWorldMapWidget.tsx` bez zmian — dalej renderuje `<UserWorldMap ... />` tymi samymi propsami. Realtime, cache miast i RPC `get_user_city_counts` nietknięte.

### 6. Sprzątanie zależności
Po podmianie zweryfikować `rg` czy `d3-geo`, `topojson-client`, `world-atlas` są używane gdzie indziej; jeśli nie — usunąć z `package.json`.

## Uwagi
- Leaflet działa client-side, brak SSR — kompatybilne z Vite.
- OSM + Esri World Imagery bez klucza API (darmowe, z atrybucją).
- Wygląd zewnętrzny widżetu (nagłówek, toggle, logo, ramka) pozostaje identyczny — zmienia się tylko wnętrze mapy i markery/klastry.
