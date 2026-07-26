## Cel

Po kliknięciu w klaster (i w pojedynczy znacznik) okno informacyjne ma pojawiać się bezpośrednio przy tym klastrze, a nie w oderwanym miejscu mapy.

## Co zrobię

1. **Popup dla klastra** (`src/components/admin/UserWorldMap.tsx`)
   - Podpięcie obsługi `clusterclick` do warstwy klastrującej: zamiast domyślnego zoomu, otwarcie popupu zakotwiczonego w `latlng` klastra, z listą miast i liczbą użytkowników (dane z `layer.getAllChildMarkers()`).
   - Popup dostaje `offset` w górę o wysokość ikony klastra, żeby „dymek" stykał się z kółkiem klastra.
   - Zoom do zawartości klastra zostaje dostępny jako przycisk w popupie („Przybliż"), żeby nie tracić obecnej funkcji.

2. **Stabilne kotwiczenie popupu**
   - Popupy markerów i klastrów: `autoPan: true` z `autoPanPadding`, `keepInView: true` oraz `closeOnClick`, tak aby przy przesunięciu mapy dymek nadal wskazywał na znacznik.
   - Usunięcie kolizji z animacją: popup otwierany po zakończeniu ewentualnego ruchu mapy (`map.once('moveend')`), co eliminuje obecny efekt „popup w rogu, znacznik gdzie indziej".

3. **Treść popupu klastra** (`src/components/admin/user-world-map/markers.ts`)
   - Nowa funkcja budująca HTML popupu klastra: nagłówek z liczbą użytkowników i liczbą lokalizacji, lista miast (max ~8 + „i X więcej"), spójna z obecnym stylem `pl-popup`.

## Szczegóły techniczne

- Pliki: `src/components/admin/UserWorldMap.tsx`, `src/components/admin/user-world-map/markers.ts`, ewentualnie drobny styl w `src/index.css` dla przycisku w popupie klastra.
- Bez zmian w bazie danych i logice pobierania punktów.
