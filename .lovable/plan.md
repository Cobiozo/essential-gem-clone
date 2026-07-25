## Naprawa uploadu logo + poprawki mapy (Leaflet)

### 1. Upload logo nie działa — brak bucketu w storage
Polityki RLS dla `dashboard-map-logos` istnieją, ale **sam bucket nie został utworzony** (`storage.buckets` nie zawiera rekordu). Przez to każdy upload kończy się cichym błędem i podgląd zostaje pusty.

**Do zrobienia (migracja SQL):**
- `INSERT` do `storage.buckets` rekordu `dashboard-map-logos` jako publiczny (`public = true`, limit 5 MB, mimy `image/*`).

Po tym istniejące polityki od razu zaczną działać, a `getPublicUrl` zwróci działający URL, który UI już poprawnie renderuje.

### 2. Widok początkowy mapy = Europa (jak na screenie)
Obecnie po pierwszym udanym geokodowaniu `initialFitDoneRef` wywołuje `fitBounds(points)` co odsuwa mapę na cały świat, jeśli są punkty poza Europą.

**Zmiana w `src/components/admin/UserWorldMap.tsx`:**
- Usunąć auto-`fitBounds` przy pierwszym załadowaniu. Zostawić stały `DEFAULT_CENTER = [52, 15]`, `DEFAULT_ZOOM = 4` (Europa Środkowa jak na screenie).
- Przycisk „Reset" nadal `flyTo(DEFAULT_CENTER, DEFAULT_ZOOM)` (bez fitBounds).

### 3. Granice państw również w trybie satelitarnym
Warstwa Esri World Imagery nie ma granic. Dodać **overlay** z granicami/etykietami na obu trybach (Esri „Reference/Boundaries and Places"): `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`. Warstwa jest przezroczysta, nakłada tylko linie i nazwy — pasuje też na klasyczną OSM bez pogorszenia czytelności (można ograniczyć overlay tylko do satelity, jeśli za dużo — ale wg wymagania ma „również posiadać granice jak klasyczna", więc overlay tylko dla trybu satelitarnego).

**Zmiana w `UserWorldMap.tsx`:**
- Nowy `overlayLayerRef`. Przy `mapStyle === 'satellite'` dodać overlay z Esri Boundaries (z `pane: 'overlayPane'`, `opacity: 0.9`). Usunąć przy zmianie stylu.

### 4. Klik w kraj = przybliżenie do granic tego kraju
Wprowadzić warstwę GeoJSON z granicami państw (lekki dataset ~250 KB: `world-countries.geo.json` z pakietu `world-countries` lub statyczny plik w `public/geo/countries.geojson` z Natural Earth 110m).

**Zmiana w `UserWorldMap.tsx`:**
- Dodać `L.geoJSON(countries, { style: { color: 'transparent', weight: 0, fillOpacity: 0 } })` — niewidoczne polygony klikalne. Na hover: `weight: 2, color: '#fbbf24', fillOpacity: 0.05` (podświetlenie konturu).
- `onEachFeature`: `click → map.flyToBounds(layer.getBounds(), { padding: [20,20], duration: 0.6 })`, co daje efekt „przybliżenie kraju na cały dostępny obszar".
- Popup na kliknięciu z nazwą kraju + liczbą użytkowników (z `points` po kraju).

**Plik do dodania:** `public/geo/countries-110m.geojson` (Natural Earth 110m, ok. 250 KB) — pobrany z `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson`.

### Pliki objęte zmianami
- migracja SQL (bucket `dashboard-map-logos`)
- `src/components/admin/UserWorldMap.tsx` (init view, overlay granic, warstwa GeoJSON, klik kraju)
- `public/geo/countries-110m.geojson` (nowy)

Bez zmian w `DashboardMapSettings.tsx` i `useDashboardMapSettings.ts` — logika uploadu jest poprawna, wystarczy założyć bucket.
