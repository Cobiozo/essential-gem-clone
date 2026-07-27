## Cel

1. Dymek (marker i klaster) sam wybiera stronę wyświetlania — nad, pod, po lewej lub po prawej od ikony — zależnie od tego, gdzie w kadrze mapy znajduje się punkt, więc nigdy nie wychodzi poza widok.
2. Podwójne kliknięcie w mapę, marker lub klaster przybliża to konkretne miejsce.

## Co zrobię

**1. Automatyczne przełączanie położenia dymka**
- Nowa funkcja pomocnicza `popupPlacementFor(map, latlng, iconSize)`: liczy pozycję punktu w pikselach kontenera (`map.latLngToContainerPoint`) i porównuje z rozmiarem kontenera oraz szacowaną wysokością/szerokością dymka.
  - Punkt wysoko w kadrze (mało miejsca nad ikoną) → dymek pod ikoną (offset dodatni w osi Y).
  - Punkt nisko → dymek nad ikoną (obecne zachowanie).
  - Punkt blisko lewej/prawej krawędzi, gdy pion nie wystarcza → dymek obok, z przesunięciem poziomym o pół szerokości dymka + margines.
- Offset wyliczany dynamicznie w momencie otwarcia (a nie raz przy tworzeniu markera), bo zależy od aktualnego kadru:
  - klaster: offset ustawiany tuż przed `popup.openOn(map)`,
  - marker: przeliczany w handlerze `popupopen` przez `popup.options.offset` + `popup.update()`.
- Klasa CSS kierunku (`pl-popup--top/bottom/left/right`) dodawana do elementu dymka, żeby ogonek/strzałka wskazywała właściwą stronę (dla dołu/boków strzałka Leafletu jest ukrywana, dodawany drobny cień kierunkowy).
- Zachowane dotychczasowe zabezpieczenia: `keepInView`, `autoPan` i `panInside` z paddingiem pod logotypy — teraz jako uzupełnienie, nie jedyny mechanizm.

**2. Dwuklik = przybliżenie miejsca**
- `doubleClickZoom` mapy pozostaje włączony dla pustego obszaru, ale zamieniony na płynny `flyTo` w punkt kliknięcia z krokiem +2 poziomy zoomu (respektując `prefersReducedMotion`).
- Dwuklik na markerze: zamyka dymek i `flyTo` na współrzędne grupy z zoomem `max(obecny + 2, 13)`.
- Dwuklik na klastrze: `zoomToBounds` dla jego dzieci (to samo, co przycisk „Przybliż”), z wcześniejszym `pushViewHistory()`, żeby przycisk „Cofnij widok” działał.
- Blokada propagacji dwukliku z ikony do mapy, żeby nie nakładały się dwie animacje zoomu.

## Szczegóły techniczne

Pliki:
- `src/components/admin/UserWorldMap.tsx` — `responsivePopupOptions` rozszerzone o wyliczanie kierunku, handler `popupopen`, `clusterclick`, nowe handlery `dblclick` (mapa, marker, klaster).
- `src/index.css` — klasy kierunkowe `.pl-popup--top/bottom/left/right` (pozycja strzałki, marginesy) oraz drobne korekty dla mobile.

Bez zmian w danych, RPC, geokodowaniu i filtrach użytkowników.