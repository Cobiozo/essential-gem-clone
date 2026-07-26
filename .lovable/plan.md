## Problem

Dymek (popup) klastra/markera na mapie „Nasi użytkownicy PLC” zostaje ucięty na krawędzi kontenera mapy — na desktopie widać tylko fragment okna, a na tablecie/mobile dymek o szerokości 260 px nie mieści się przy wąskim kontenerze.

## Co zrobię

**1. Popup zawsze w widocznym obszarze**
- Włączyć `autoPan` z większym marginesem (`autoPanPadding` ok. 32 px, na mobile 12 px) i `keepInView: true` dla obu typów dymków (klaster i marker).
- Po otwarciu dymka wywołać `map.panInside(latlng, { padding })`, żeby Leaflet dosunął widok, gdy dymek wystaje poza kontener.
- Dodać `autoPanPaddingTopLeft` uwzględniające logo w lewym górnym rogu, aby dymek nie chował się pod nakładką z logotypami.

**2. Responsywne rozmiary dymka**
- Szerokość liczona z rzeczywistej szerokości kontenera mapy: `maxWidth = min(260, szerokość - 48)`, minimum ~180 px.
- Na mobile (<640 px) zmniejszona czcionka, mniejszy padding i `max-height` listy miejscowości (ok. 40% wysokości mapy) z własnym przewijaniem.
- Przycisk „Przybliż” i przycisk zamknięcia powiększone do minimum 32 px celu dotykowego.

**3. Poprawki CSS mapy dla tablet/mobile**
- `.pl-popup .leaflet-popup-content` — responsywny `max-width`/`max-height` z `overflow:auto`, `overscroll-behavior: contain`.
- Media query <768 px: mniejsze ikony markerów/klastrów, mniejszy pasek kontrolek zoomu, aby nie zasłaniały dymka.
- Zapewnić, że kontener mapy nie ma `overflow: hidden` obcinającego warstwę popupów (jeśli ma — przenieść zaokrąglenie na wrapper i pozostawić pane popupów widoczny w granicach mapy).

## Szczegóły techniczne

Pliki:
- `src/components/admin/UserWorldMap.tsx` — opcje popupów (klaster: ok. linii 248-256, marker: ok. 409-417), obliczanie `maxWidth` z `map.getSize()`, `panInside` po `popupopen`.
- `src/components/admin/user-world-map/markers.ts` — usunięcie inline `min-width:180px` na rzecz klas CSS, ograniczenie listy z przewijaniem.
- `src/index.css` — klasy `.pl-popup` responsywne + media query mobile.

Bez zmian w logice danych, RPC ani filtrach użytkowników.
