## Cel

Zmienić wygląd mapy w „Statystyki użytkowników" tak, by przypominała załączone zdjęcie — realistyczny obraz satelitarny Ziemi (oceany, kontynenty, chmury), zamiast obecnych płaskich poligonów krajów. Kropki użytkowników, klastry, hover, zoom (do 200), kontury miast i wszystkie obecne funkcje pozostają bez zmian.

## Podejście (bezpieczne, jeden plik)

Plik: `src/components/admin/UserWorldMap.tsx`.

`react-simple-maps` używa projekcji `geoEqualEarth` / `geoMercator`. Aby pokazać realne zdjęcie Ziemi, najprościej i najbezpieczniej:

1. **Dodać warstwę rastrową** (`<image>`) jako tło wewnątrz `<ComposableMap>`, **przed** `<Geographies>`, korzystając z gotowej tekstury Blue Marble (NASA, domena publiczna) w projekcji equirectangular — ten sam typ obrazka, który załączył użytkownik.
2. Zmienić projekcję `ComposableMap` z obecnej (`geoEqualEarth`) na **`geoEquirectangular`**, żeby piksele tekstury 1:1 pokrywały się z geografią (longitude → x, latitude → y). Dzięki temu kropki miast nadal trafiają w prawidłowe miejsca na zdjęciu.
3. Wyłączyć/wytłumić wypełnienie obecnych poligonów krajów (`<Geography fill="transparent" />`) — zostawiamy je jako **niewidoczną warstwę interakcji** (klik w kraj → `selectedIso`, hover statystyk kraju działa bez zmian), ale wizualnie pokazuje się zdjęcie satelitarne pod spodem.
4. Granice/kontury miast (`city_boundaries`) pozostają — rysują się **na** zdjęciu z dotychczasową krzywą opacity.
5. Kropki i klastry — bez zmian (kolor `hsl(var(--primary))`, rozmiary z poprzedniej iteracji).

## Tekstura

- Źródło: NASA Visible Earth „Blue Marble Next Generation" (public domain) — wersja 2048×1024 lub 5400×2700 px, equirectangular, PNG/JPG.
- Pobierana raz, hostowana lokalnie: `public/textures/earth-bluemarble-2k.jpg` (~300–600 KB w 2K).
- Wstawiana jako `<image href="/textures/earth-bluemarble-2k.jpg" x="-180" y="-90" width="360" height="180" preserveAspectRatio="none" />` w układzie współrzędnych geograficznych projekcji equirectangular.
- Brak nowych zależności npm.

## Warianty wyglądu (do wyboru w trakcie wdrożenia, jeśli zechcesz)

- **A. Realistyczny Blue Marble** (jak na Twoim screenie) — kolorowe oceany, lądy, chmury.
- **B. Stonowany / ciemny** — ta sama tekstura z nakładką `<rect fill="hsl(var(--background))" opacity="0.35"/>`, żeby kropki primary były bardziej kontrastowe na ciemnym UI.
- **C. Nocna Ziemia (Black Marble)** — alternatywna tekstura NASA (światła miast nocą) — bardzo efektowna pod ciemny motyw.

Domyślnie proponuję **A** (zgodnie z Twoim obrazkiem).

## Bezpieczeństwo / brak regresji

- Zmiany **wyłącznie w jednym pliku komponentu** + jeden statyczny plik w `public/textures/`.
- Żadnych zmian w: queries, edge functions (`geocode-cities`, `geocode-city-boundary`), polling cap (30), kluczach query, RLS, schemacie, eksporcie CSV/XLSX.
- Klik w kraj, hover statystyk, zoom (200), kontury miast, klastry, „Odśwież", panel boczny — bez zmian funkcjonalnych.
- Tekstura ładowana lokalnie (bez external CDN) → brak ryzyka CORS / blokad / wycieku.
- Rozmiar 2K JPG (~400 KB) ładowany raz, cache przeglądarki → znikome obciążenie.
- Projekcja `geoEquirectangular` jest wbudowana w `d3-geo` (już w drzewie zależności `react-simple-maps`) → brak nowych paczek.

## Weryfikacja

- Build (auto).
- Wizualnie w `/admin?tab=user-stats`: tekstura pokrywa cały świat, kropki Warszawy/Krakowa lądują na właściwych miastach, zoom 4 → 50 → 200 płynny, kontury miast nadal się pojawiają, klik w kraj nadal podświetla i otwiera panel.

## Otwarte pytanie

Wariant kolorystyczny: **A** (pełny Blue Marble, jak na screenie), **B** (Blue Marble + lekkie ciemne tonowanie pod UI), czy **C** (Black Marble — nocna Ziemia ze światłami miast)?
