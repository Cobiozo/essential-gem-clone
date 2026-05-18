# Mapa świata — stabilizacja zoomu i realtime aktualizacje

## Cel
1. Zagwarantować, że kliknięcie kraju na mapie nigdy nie przybliży „obok" (np. Francja → Gujana / Reunion, Holandia → Karaiby, USA → Hawaje/Alaska, Hiszpania → Wyspy Kanaryjskie itd.).
2. Sprawić, by punkty (miasta) użytkowników aktualizowały się na żywo — bez potrzeby odświeżania strony — gdy zarejestruje się nowy użytkownik lub istniejący uzupełni miasto/kraj.

---

## 1. Trwałe zabezpieczenie zoomu krajów

Plik: `src/components/admin/UserWorldMap.tsx`

### a) Rozszerzenie listy `COUNTRY_BBOX_OVERRIDES`
Obecna lista (FR, NL, GB, US, PT, ES, DK, NO, RU) nie pokrywa wszystkich krajów z terytoriami zamorskimi. Dodajemy mainland-only granice dla:

- `FI` (bez Alandów dryfu) — Finlandia
- `IT` — Włochy (bez wysuniętej Pantellerii)
- `GR` — Grecja (kompaktowy zakres egejski)
- `TR` — Turcja
- `CN`, `IN`, `JP`, `KR`, `AU`, `NZ`, `BR`, `AR`, `MX`, `CA`, `ZA`, `EG`, `MA`, `UA`, `DE`, `BE`, `CH`, `AT`, `SE`, `IE`, `IS`, `PL`, `CZ`, `SK`, `HU`, `RO`, `BG`
- Wszystkie ISO, dla których normalizeCountry zwraca kod, ale geometria TopoJSON sięga > 1500 km od środka masy lądu.

### b) Fail-safe gdy override nie istnieje
Gdy nie ma override, zamiast zwykłego `pathGen.bounds(feature)`:
1. Wyliczamy bounding box.
2. Sprawdzamy, czy szerokość `w` ani wysokość `h` nie przekraczają sensownego progu (np. > 60% szerokości całej mapy SVG dla kraju, który nie jest Rosją/USA/Kanadą/Chinami/Brazylią/Australią). Jeśli przekracza → traktujemy jako „rozjechana geometria z terytoriami zamorskimi" i wycofujemy się do bezpiecznego zachowania: zoom do centroidu pierwszej (największej) polygonu w MultiPolygon.
3. Dodajemy whitelistę krajów, dla których pełny bbox jest OK (RU, US, CA, CN, BR, AU, KZ).

### c) Twarde ograniczenie wynikowego zoomu i pozycji
Po wyliczeniu `cx/cy/zoom`:
- Klampujemy `zoom` do `[MIN_ZOOM, MAX_ZOOM]`.
- Walidujemy `cx, cy` — muszą leżeć wewnątrz prostokąta `VIEW_W × VIEW_H` z marginesem. Jeśli wypadają poza → fallback do `defaultView` i log ostrzegawczy do konsoli (debug, nie błąd).

### d) Testy regresji ręczne (lista w komentarzu w kodzie)
Krótki komentarz w pliku z listą krajów do sprawdzenia po każdej zmianie (FR, NL, US, GB, ES, PT, DK, NO, RU, AU, NZ) — żeby przyszłe edycje nie zepsuły logiki bez wiedzy.

---

## 2. Realtime aktualizacja użytkowników na mapie

Źródłem danych jest RPC `get_user_city_counts` (agreguje miasta z `profiles`). Aktualnie wywoływane jednorazowo w `useEffect([])`.

### a) Hook nasłuchu zmian w `profiles`
W `src/components/dashboard/widgets/UserWorldMapWidget.tsx` oraz analogicznie w `src/components/admin/UserStatistics.tsx`:

1. Subskrybujemy kanał Supabase Realtime:
   ```ts
   supabase.channel('profiles-map')
     .on('postgres_changes',
         { event: '*', schema: 'public', table: 'profiles',
           filter: 'city=neq.null' }, // i osobno country
         () => refetch())
     .subscribe();
   ```
2. Debounce 1500 ms — żeby rafał kilku zapisów pod rząd nie spamował RPC.
3. Cleanup: `removeChannel` przy unmount.

### b) Wrapowanie pobierania w `useQuery`
Zamiast ręcznego `useEffect + setState`, używamy `useQuery(['user-city-counts'], ...)` z `staleTime: 60_000`. Daje to:
- Automatyczny `refetch()` wywoływany z subskrypcji realtime.
- Współdzielenie cache między widgetem dashboardu a panelem admina.
- Zachowanie fallbacku do localStorage (`CITIES_CACHE_KEY`) w `placeholderData`.

### c) Bezpiecznik backendowy
RPC `get_user_city_counts` musi być wystawiona w publikacji realtime tylko jeśli nie wystarczy nasłuch tabeli `profiles`. Plan: nasłuchujemy `profiles` (już w publikacji), a klient sam wywołuje RPC po evencie — nie zmieniamy SQL.

### d) Ochrona przed nadmiernymi wywołaniami
- Refetch tylko gdy widget jest widoczny (`document.visibilityState === 'visible'`).
- Po wywołaniu — aktualizacja localStorage cache (już istnieje `writeCitiesCache`).

---

## Pliki do zmiany

- `src/components/admin/UserWorldMap.tsx` — pkt 1 (override + fail-safe + clamp).
- `src/components/dashboard/widgets/UserWorldMapWidget.tsx` — pkt 2 (useQuery + realtime).
- `src/components/admin/UserStatistics.tsx` — pkt 2 dla widoku admina (osobne źródło `stats.cities`; rozważymy podpięcie tego samego nasłuchu i triggera odświeżania statystyk lub samego punktu mapowego).

## Co NIE wchodzi w zakres
- Zmiany schematu DB / migracje.
- Zmiany w edge functions `geocode-cities` / `geocode-city-boundary`.
- Zmiany w innym UI poza komponentem mapy i jego dwoma kontenerami.
