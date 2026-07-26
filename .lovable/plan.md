## Cel

Kompleksowy refaktoring modułu mapy użytkowników PLC: poprawna geometria granic państw (bez terytoriów zamorskich), premium warstwa wizualna/animacyjna, lepszy UX i wydajność — bez zmiany API komponentu (`Props` w `UserWorldMap`), struktury danych ani logiki biznesowej (geokodowanie, grupowanie, zliczanie użytkowników pozostaje bez zmian).

## 1. Naprawa geometrii państw (priorytet)

Nowy moduł `src/lib/geoSanitize.ts` — uniwersalny, bez wyjątków per-kraj:

- Wejście: surowy FeatureCollection z `/geo/countries-50m.geojson`.
- Dla każdego `Feature` typu `MultiPolygon`:
  1. Policz przybliżone pole każdego ringu zewnętrznego (wzór shoelace na współrzędnych geograficznych, skalowany przez `cos(lat)` — wystarczająco dokładny do rankingu).
  2. Wyznacz polygon największy = „rdzeń kraju”.
  3. Zachowaj tylko te polygony, które: są rdzeniem **lub** leżą w promieniu progowym od rdzenia (centroid w odległości < ~1000 km) **oraz** mieszczą się w oknie kontynentalnym wyznaczonym dynamicznie z rdzenia.
  4. Odrzuć resztę (terytoria zamorskie, wyspy zależne).
- Dla `Polygon` — bez zmian.
- Wynik: nowy FeatureCollection, liczony **raz** i cache'owany w module (mapa modułowa), więc kolejne montowania komponentu nie przeliczają geometrii.

Efekt: Francja bez Gujany/Reunion, Norwegia bez Svalbardu, Dania bez Grenlandii, Portugalia bez Azorów/Madery, Hiszpania bez Kanarów, Holandia bez Karaibów, UK bez terytoriów zamorskich — wynikające z reguły odległościowej, nie z listy wyjątków. `getBounds()` po kliknięciu kraju obejmuje wtedy tylko część główną, więc `flyToBounds` przybliża poprawnie.

## 2. Warstwa wizualna i animacje

Nowy plik stylów mapy dołączony do `src/index.css` (sekcja mapy, wyłącznie tokeny semantyczne):

- **Markery**: wejście `scale-in` z opóźnieniem kaskadowym, subtelny pierścień pulsujący (`@keyframes` z `transform`/`opacity`, GPU-friendly), hover z lekkim uniesieniem.
- **Klastry**: animowane rozdzielanie (`animateAddingMarkers: true`, `spiderfyDistanceMultiplier`), płynne skalowanie ikony.
- **Popupy**: fade + scale in/out z easingiem, zaokrąglenia i cień w stylu premium.
- **Kraje**: przejście koloru/wypełnienia przez CSS `transition` na ścieżkach SVG (hover i stan wybrany), zamiast twardej podmiany stylu.
- **Przełączanie warstw**: nowa warstwa kafli dodawana z `opacity: 0`, po `load` fade-in i dopiero wtedy usunięcie starej — koniec migotania.
- **Pierwsze załadowanie**: fade-in kontenera + delikatny `flyTo` z pozycji lekko oddalonej.
- Wszystkie animacje respektują `prefers-reduced-motion`.

## 3. UX

- Auto-dopasowanie widoku (`fitBounds`) do wszystkich zgeokodowanych użytkowników przy pierwszym udanym załadowaniu punktów (tylko raz, nie przy każdej aktualizacji).
- Klik klastra: `zoomToBoundsOnClick` z dłuższą, wygładzoną animacją.
- Przycisk „wstecz” obok zoom/reset — powrót do poprzedniego widoku (stos ostatnich widoków, max 10).
- Skalowanie markerów zależne od poziomu zoomu (klasa CSS na kontenerze mapy przełączana przy `zoomend`, bez re-renderu Reacta).
- Zachowany obecny układ przycisków w prawym dolnym rogu.

## 4. Wydajność

- `escapeHtml`, builder HTML popupu i ikony wydzielone do modułu pomocniczego; treść popupu tworzona **leniwie** (`bindPopup(fn)`) zamiast dla wszystkich markerów naraz.
- Handlery (`applyCountryLayerVisibility`, `resetActiveCountry`, zoom/reset) w `useCallback`/`useRef`, listenery rejestrowane raz z poprawnym cleanupem.
- Jeden delegowany zestaw handlerów na warstwie GeoJSON zamiast trzech listenerów na każdy z ~240 krajów.
- Geometria filtrowana raz i memoizowana modułowo; `canvas`/`svg` renderer bez ponownego tworzenia.
- Aktualizacja markerów bez pełnego `clearLayers()` gdy zestaw grup jest identyczny (porównanie po kluczach).
- `requestAnimationFrame` + `ResizeObserver` zamiast `setTimeout` do `invalidateSize`.

## 5. Refaktoring struktury

Rozbicie 768-liniowego pliku, przy zachowaniu domyślnego eksportu i tego samego `Props`:

```text
src/components/admin/UserWorldMap.tsx        // komponent (UI + orkiestracja), API bez zmian
src/components/admin/user-world-map/
  constants.ts        // TILE_LAYERS, style krajów, zoomy
  geocodeCache.ts     // cache localStorage + geocodeCities (bez zmian logiki)
  useUserGroups.ts    // memoizacja items/queryKey/groups/liczników
  markers.ts          // ikony + HTML popupów
  countriesLayer.ts   // ładowanie i konfiguracja warstwy krajów
src/lib/geoSanitize.ts // filtr geometrii kontynentalnej
```

## Szczegóły techniczne

- Zależności bez zmian (`leaflet`, `leaflet.markercluster` już obecne).
- `/geo/countries-50m.geojson` pozostaje źródłem; filtrowanie po stronie klienta przy pierwszym fetchu (wynik w module-cache).
- Brak zmian w bazie danych, RPC `get_user_location_points`, edge function `geocode-cities` i w `UserWorldMapWidget.tsx`.
- Weryfikacja: Playwright — zrzuty po kliknięciu Francji, Norwegii i Danii oraz sprawdzenie płynności przełączania warstw.

Uwaga: widoczne na zrzucie „Francja — 0 użytkowników” to kwestia danych/geokodowania, nie geometrii; ten plan nie zmienia liczenia użytkowników. Mogę to zbadać osobno, jeśli chcesz.
