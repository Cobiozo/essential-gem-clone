## Co jest nie tak (zweryfikowane)

- **Geolokalizacja**: w bazie `city_geocache` jest **153 wpisy, wszystkie z współrzędnymi, ale wszystkie bez ulicy**. Frontend od ostatniej zmiany buduje klucz `ulica|miasto|kraj`, a 160 z 172 profili ma wypełnioną ulicę — więc prawie każde zapytanie **nie trafia w cache** i ląduje w wolnej kolejce Nominatim (1,1 s/wpis, z limitami). Stąd „Zlokalizowano 12 / 172".
- **Drugie logo**: w `UserWorldMap.tsx` prawy logotyp liczony jest jako `logoRightUrl ?? (logoLeftUrl === undefined ? DEFAULT_RIGHT : '')` — gdy admin ustawi tylko lewe logo, prawe dostaje pusty string i **nigdy się nie renderuje**.
- **Klik w kraj**: warstwa GeoJSON krajów jest dodawana przy `preferCanvas: true` z `fillOpacity: 0.001` i ręcznym przełączaniem `pointer-events` przez `getElement()` — przy rendererze canvas ta metoda nie działa jak przy SVG, więc kliknięcia nie docierają do polygonów i `flyToBounds` się nie uruchamia.

## Plan naprawy

### 1. Geolokalizacja wszystkich użytkowników — precyzja do miasta
- W `src/components/admin/UserWorldMap.tsx` zmienić klucz geokodowania na **`miasto|kraj`** (bez ulicy), zgodnie z prośbą. Ulica zostaje tylko jako informacja w popupie, nie wpływa na punkt.
- Dzięki temu 153 istniejące wpisy cache trafiają od razu — mapa pokazuje komplet użytkowników bez czekania na Nominatim.
- Grupowanie markerów po współrzędnych miasta; popup: miasto, kraj (flaga), liczba użytkowników i lista „Imię N.".
- Wyliczyć i dokłdanie pokazać w nagłówku „Zlokalizowano X / Y użytkowników (Z miast)"; brakujące miasta (nowe, spoza cache) nadal dogeokodowane w tle z licznikiem „Geokoduję w tle".
- W widżecie `UserWorldMapWidget.tsx` nic nie zmieniamy w źródle danych (RPC `get_user_location_points` już zwraca po jednym rekordzie na użytkownika).

### 2. Drugie logo
- Poprawić logikę w `UserWorldMap.tsx`: lewy i prawy logotyp niezależnie — jeśli admin ustawił URL, użyj go; jeśli nie, użyj domyślnego (Pure Life po lewej, Eqology IBP po prawej). Pusty string w ustawieniach = świadome ukrycie danego logo.
- Separator między logotypami tylko gdy oba widoczne.

### 3. Klik w kraj = przybliżenie
- Wyłączyć `preferCanvas` dla warstwy krajów: renderować GeoJSON przez `L.svg()` we własnym panie (poniżej markerów), z widocznym cienkim obrysem granic i minimalnym wypełnieniem.
- Klik w kraj → `flyToBounds(bounds, { padding, maxZoom: 7 })` + popup z nazwą kraju i liczbą użytkowników; hover podświetla obrys.
- Zamiast ręcznego manipulowania `pointer-events` — sterować przez `removeLayer/addLayer` panelu krajów przy zoomie > 6, tak aby markery pozostały klikalne po przybliżeniu.
- Granice widoczne również w trybie satelitarnym (obecna nakładka Esri zostaje, GeoJSON dodaje spójny obrys).

## Szczegóły techniczne

Pliki do zmiany:
- `src/components/admin/UserWorldMap.tsx` — klucz geokodowania (usunięcie `street`), logika logotypów, warstwa krajów na rendererze SVG w dedykowanym panie, obsługa zoomu.
- `supabase/functions/geocode-cities/index.ts` — priorytet miasto+kraj, ulica ignorowana w kluczu cache (zachowanie zgodności z istniejącymi 153 wpisami).

Bez zmian w schemacie bazy — istniejący cache `city_geocache` (city, country) jest w pełni wykorzystany.
