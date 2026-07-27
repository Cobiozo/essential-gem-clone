## Problemy widoczne na zrzutach

1. Dymek (marker i klaster) potrafi wylądować częściowo **poza kadrem mapy** — wychodzi w lewo poza kontener i pod dolną krawędź, przez co jest ucinany (`overflow-hidden` na `pl-map-shell`).
2. Pasek nawigacji mapy (+ / − / cofnij / reset) ma sztywne `right-[200px]` i na wąskich ekranach **wychodzi poza lewą krawędź mapy**.

## Co zrobię

**1. Dymek zawsze w kadrze**
- W `popupPlacementFor` po wybraniu strony dodam **klamrowanie offsetu do granic kontenera**: liczę prostokąt dymka (pozycja punktu + offset ± połowa szerokości / wysokość) i koryguję offset X/Y tak, aby prostokąt mieścił się między marginesami (góra: pas logotypów, dół: atrybucja + pasek przycisków, boki: 8–12 px).
- Wybór strony oparty na realnie zmierzonym rozmiarze dymka: pierwszy pomiar po otwarciu, potem drugie przeliczenie w `requestAnimationFrame` (dymek ma już finalną wysokość) — dziś placement liczony jest raz na wartościach szacunkowych, stąd ucięcia.
- Gdy dymek jest wyższy/szerszy niż dostępne miejsce, ograniczę jego `maxHeight`/`maxWidth` do wymiaru kontenera (minus marginesy), zamiast pozwalać mu wystawać.
- `panInside` zostaje jako uzupełnienie, ale wykonywane po korekcie offsetu i tylko jeśli po klamrowaniu nadal brakuje miejsca.

**2. Pasek nawigacji responsywny**
- Zamiana `right-[200px]` na pozycjonowanie responsywne: na desktopie pasek zostaje nad atrybucją po prawej, na wąskich mapach (`<640 px`) przechodzi do prawego dolnego rogu w rzędzie nad atrybucją, z mniejszymi przyciskami (h-8/w-8) i `max-w-full`, żeby nigdy nie wychodził poza kontener.
- Atrybucja Leafletu dostanie na mobile mniejszy font/padding, aby nie kolidowała z paskiem.

## Szczegóły techniczne

Pliki:
- `src/components/admin/UserWorldMap.tsx` — `popupPlacementFor` (klamrowanie do kontenera), handler `popupopen` (drugi pomiar w rAF, dynamiczny `maxHeight`), kontener przycisków nawigacji (klasy responsywne).
- `src/index.css` — korekty `.pl-popup__body` (max-height liczony ze zmiennej ustawianej w JS) oraz `.leaflet-control-attribution` na mobile.

Bez zmian w danych, RPC, geokodowaniu i logice filtrów.
