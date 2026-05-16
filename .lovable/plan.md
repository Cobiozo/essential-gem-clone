## Problem

Po zalogowaniu na `/dashboard` pojawia się ErrorBoundary z komunikatem `u[i] is not a function`. To wskazuje na wyjątek w trakcie renderu jednego z widżetów dashboardu. Najbardziej prawdopodobny winowajca to świeżo zmodyfikowany widżet mapy świata (`UserWorldMapWidget` → `UserWorldMap`) renderowany w `DashboardFooterSection`. Jeden niespodziewany kształt danych w tym widżecie obecnie wywala cały pulpit.

## Plan naprawy

### 1) Izolacja: ErrorBoundary wokół widżetu mapy
Aby błąd w mapie nigdy więcej nie blokował całego pulpitu, opakować `<UserWorldMapWidget />` w `DashboardFooterSection.tsx` własnym `ErrorBoundary` (z `fallback={null}`), tak by przy awarii mapy reszta strony renderowała się normalnie.

### 2) Lokalizacja prawdziwego błędu
Po izolacji:
- dodać krótki `try/catch` wraz z `console.error('[UserWorldMap] render error', e)` w punktach wejścia useMemo (`points`, `clusters`, `boundaryFeatures`),
- po wejściu użytkownika na `/dashboard` odczytać stack z konsoli i wskazać linię,
- usunąć tymczasowe logi po naprawie.

### 3) Twarda naprawa najczęstszych przyczyn (defensywnie, bez zmian funkcjonalności)
- W `UserWorldMapWidget.tsx`: gdy `settings.logo_left_url` lub `settings.logo_right_url` jest pustym stringiem, przekazywać `undefined` (zapobiega pustym `<img>`).
- W `UserWorldMap.tsx`: 
  - upewnić się, że `cities` zawsze jest tablicą (`Array.isArray(cities) ? cities : []`),
  - zabezpieczyć `geo.forEach`/`points.map` przed brakującym `data?.results`,
  - blok logo renderować tylko gdy faktycznie jest `logoLeftUrl || logoRightUrl` lub brak nadpisania (czytelniejsza logika niż obecne wyrażenie).

### 4) Weryfikacja
- Wejście na `/dashboard` jako zalogowany użytkownik — pulpit ładuje się w całości.
- Sekcja mapy działa (lub, jeśli nadal padnie, jest cicho ukryta i mamy stack w konsoli do dalszej naprawy).
- Brak regresji w `/admin?tab=user-stats`, gdzie `UserWorldMap` jest używana z pełnym nagłówkiem.

## Pliki do zmiany
- `src/components/dashboard/widgets/DashboardFooterSection.tsx` — `ErrorBoundary` wokół `UserWorldMapWidget`.
- `src/components/dashboard/widgets/UserWorldMapWidget.tsx` — normalizacja pustych URL-i logo do `undefined`.
- `src/components/admin/UserWorldMap.tsx` — guardy na `cities`/`geo`, czytelniejszy warunek render logo, tymczasowe logi diagnostyczne.

## Bez zmian
- Schemat bazy i bucket `dashboard-map-logos` (już zmigrowane i działają).
- Panel admina `DashboardMapSettings.tsx`.
- Pozostałe widżety pulpitu.
