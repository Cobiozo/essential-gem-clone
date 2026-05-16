## Cel

Dodać do zakładki **Statystyki użytkowników** interaktywną mapę świata z kropkami pokazującymi miasta, w których mamy użytkowników. Na mapie/etykietach widoczne tylko: nazwa miasta + liczba użytkowników. Żadnych imion, e-maili, adresów ani innych danych osobowych.

## Architektura

### 1) Geokodowanie miast (jedno źródło prawdy)

Aby pokazać kropki, każde miasto musi mieć współrzędne lat/lng. Robimy to po stronie backendu z cache w bazie — Nominatim (OSM) jest darmowy, ale ma limit 1 req/s, więc każde miasto pobieramy raz i zapisujemy.

**Nowa tabela:** `public.city_geocache`
- `city` (text), `country` (text), `lat` (double precision), `lng` (double precision), `provider` (text), `created_at`, `updated_at`
- Unikalny indeks `(lower(city), lower(country))`
- RLS: SELECT dla zalogowanych adminów (przez `has_role`), INSERT/UPDATE tylko przez service role (edge function).

**Nowa edge function:** `geocode-cities`
- Wejście: lista `{ city, country }` (max ~100 na żądanie).
- Dla każdej pary: sprawdź cache → jeśli brak, zapytaj Nominatim z `User-Agent` aplikacji, opóźnienie 1.1s między requestami, zapisz w cache (lub zapisz `lat=null` z timestampem przy fail, by nie pytać ponownie częściej niż co 7 dni).
- Zwraca listę z `lat/lng` (lub `null` gdy nie znaleziono).
- Tylko admin (weryfikacja JWT + `has_role('admin')`).

### 2) Komponent mapy

**Nowy plik:** `src/components/admin/UserWorldMap.tsx`
- Biblioteka: `react-simple-maps` (lekki SVG, brak WebGL, działa od ręki). Dodatkowo użyć darmowego world-atlas TopoJSON (110m) z `world-atlas` na npm — bez zewnętrznych fetchów w runtime.
- Wejście: lista `{ city, country, count }` (już zagregowana w `UserStatistics`, bez danych osobowych).
- Logika: 
  1. Wyciąga unikalne pary city+country (pomija „Nieznane"/puste).
  2. Wywołuje `supabase.functions.invoke('geocode-cities', { body: { items } })` — wynik trzyma w react-query (`staleTime: 24h`).
  3. Renderuje `ComposableMap` (projection `geoNaturalEarth1`), `Geographies` (kraje, neutralne kolory z design system: `fill: hsl(var(--muted))`, `stroke: hsl(var(--border))`).
  4. Dla każdego miasta z `lat/lng`: `Marker` z `<circle>`, promień skalowany logarytmicznie do liczby userów (`r = 3 + Math.log2(count + 1) * 2`), kolor `hsl(var(--primary))`, opacity 0.7, biały obrys.
  5. Tooltip on-hover: **tylko** `Miasto, Kraj · N użytkowników` (komponent `Tooltip` z shadcn lub natywny `<title>`).
  6. Zoom & pan: `ZoomableGroup`, kontrolki + / − / reset w prawym dolnym rogu.
  7. Legenda w lewym dolnym rogu: 3 wielkości kropek z opisem zakresów.
- Pasek nad mapą: licznik „X miast · Y zlokalizowanych · Z bez lokalizacji" + przycisk „Odśwież geokodowanie" (force re-fetch dla braków).
- Pusty stan: gdy brak danych → komunikat „Brak danych adresowych do wyświetlenia".

### 3) Integracja z istniejącym panelem

**Plik:** `src/components/admin/UserStatistics.tsx`
- Sekcja Geografia: nowy `Card` „Mapa świata użytkowników" **nad** tabelami krajów i miast.
- Przekazuje do `<UserWorldMap />` już zagregowane `stats.cities` z dodanym polem `country` (już istnieje) i `count`. Komponent sam zadba o filtr „Nieznane".
- Respektuje aktywny filtr kraju (jeśli wybrany kraj ≠ all → mapa też się zawęża; przy „all" widać cały świat).

### 4) Prywatność

- Frontend **nigdy** nie przekazuje do mapy ID, e-maili ani innych pól z `profiles`. Tylko zagregowane `{ city, country, count }`.
- Edge function geokodująca dostaje tylko `{ city, country }` — żadnych danych osobowych.
- Tooltipy i etykiety mapy zawierają wyłącznie `Miasto, Kraj` i liczbę.

## Zależności do dodania

- `react-simple-maps` (~30 kB)
- `world-atlas` (TopoJSON krajów świata, ~100 kB, bundlowany lokalnie)
- Typy: `@types/react-simple-maps` (dev)

## Pliki

- **NOWY** `supabase/migrations/...` — tabela `city_geocache` + RLS + indeks.
- **NOWY** `supabase/functions/geocode-cities/index.ts` — geokodowanie z Nominatim + cache.
- **NOWY** `src/components/admin/UserWorldMap.tsx` — mapa świata.
- **EDYCJA** `src/components/admin/UserStatistics.tsx` — osadzenie mapy w sekcji Geografia.

## Poza zakresem

- Heatmapa (na razie kropki skalowane log). Można dodać w kolejnej iteracji.
- Wyświetlanie pojedynczych użytkowników (zabronione — wymaganie prywatności).
- Płatne API (Mapbox/Google) — Nominatim wystarczy dla skali projektu.
