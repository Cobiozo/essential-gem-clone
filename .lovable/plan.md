## Plan naprawy mapy użytkowników PLC

Problem nie zostanie już naprawiany kolejnymi drobnymi korektami offsetu Leafletu. Obecny kod nadal opiera dymki na natywnej geometrii `L.popup`, a potem próbuje je przesuwać i klamrować po renderze. To jest za mało stabilne przy krawędziach mapy, klastrach, logo i dolnych kontrolkach.

## Co zmienię

1. **Zastąpię dymki Leafletu własnym kontrolowanym dymkiem w React**
   - Kliknięcie markera lub klastra zapisze aktywny dymek w stanie komponentu.
   - Dymek będzie renderowany jako absolutny element wewnątrz `.pl-map-shell`, a nie jako `L.popup`.
   - Pozycja będzie liczona z `map.latLngToContainerPoint()`, ale finalne `left/top` będą zawsze klamrowane do realnych granic kontenera mapy.

2. **Dymek zawsze w kadrze**
   - Algorytm wybierze najlepszą stronę: prawa / lewa / góra / dół, zależnie od ilości miejsca.
   - Jeśli dymek jest przy krawędzi, zostanie przesunięty do środka mapy, zamiast być ucinany.
   - Jeśli dymek jest zbyt wysoki lub szeroki, dostanie `max-height` / `max-width` i przewijanie wewnątrz.
   - Dymek nie będzie mógł wejść pod logo, atrybucję ani pasek kontrolek.

3. **Cluster: dymek zaraz obok klastra**
   - Dla klastra preferowana będzie pozycja po prawej lub lewej stronie ikony.
   - Jeżeli przy krawędzi nie ma miejsca, dymek automatycznie przejdzie nad lub pod klaster.
   - Kliknięcie „Przybliż” w dymku nadal będzie przybliżało klaster.

4. **Marker miasta: dymek bez ucinania przy dole mapy**
   - Kliknięcie pojedynczego miasta pokaże dymek w tym samym systemie pozycjonowania.
   - Dla punktów przy dolnej krawędzi dymek nie będzie już wychodził poza mapę.

5. **Naprawię pasek nawigacji na desktop/tablet/mobile**
   - Usunę sztywne pozycjonowanie typu `right-[200px]`.
   - Kontrolki dostaną stabilne miejsce z prawym/dolnym marginesem i rezerwą dla atrybucji.
   - Na mobile przyciski będą mniejsze i nie będą nachodzić na dolną część mapy ani na dymki.

6. **Dopasuję CSS pod nowy system**
   - Usunę zależność od `.leaflet-popup` dla głównych dymków mapy użytkowników.
   - Dodam klasy dla własnego dymka: wrapper, strzałka, warianty stron, body, scroll.
   - Zachowam obecny premium wygląd: ciemne tło, zaokrąglenie, cień, czytelne listy użytkowników.

## Pliki

- `src/components/admin/UserWorldMap.tsx`
  - aktywny dymek w stanie React,
  - pomiar rozmiaru dymka,
  - przeliczanie pozycji przy `move`, `zoom`, `resize`, `moveend`, `zoomend`,
  - kliknięcia markerów i klastrów bez natywnego `L.popup`,
  - poprawa położenia kontrolek.

- `src/index.css`
  - style własnego dymka mapy,
  - style strzałek i przewijania,
  - responsywne ustawienia mobile/tablet,
  - korekta atrybucji Leafletu.

## Walidacja po wdrożeniu

- Sprawdzę przypadki ze zrzutów:
  - klaster przy lewym dolnym rogu,
  - marker blisko dolnej krawędzi,
  - desktop z panelem bocznym,
  - tablet/mobile.
- Zweryfikuję, że:
  - dymek nigdy nie wychodzi poza mapę,
  - cluster pokazuje liczbę użytkowników i listę miejsc,
  - „Przybliż” działa,
  - podwójne kliknięcie nadal przybliża,
  - kontrolki nie zasłaniają dymka ani atrybucji.