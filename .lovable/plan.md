## Mapa użytkowników — precyzyjne punkty (ulica) i popup z imionami

### Co jest nie tak dziś
- RPC `get_user_city_counts` grupuje po `city + country`, więc dla każdego miasta jest **jeden punkt** dokładnie w centroidzie miasta zwróconym przez Nominatim. Nawet jeśli użytkownik ma ulicę w profilu, mapa nie „zna" ulicy → im wyższy zoom, tym punkt wygląda jak „w środku miasta", a wielu użytkowników tego samego miasta zlewa się w jedną kropkę.
- `markerClusterGroup` nie ma `disableClusteringAtZoom`, więc klaster potrafi przetrwać do bardzo wysokiego zoomu i „chować" pojedyncze miasta.
- Niewidoczna warstwa GeoJSON państw (`fillOpacity: 0.001`) siedzi na wierzchu i przy dużym zoomie może wchłaniać kliknięcia w markery.
- Popup pokazuje tylko liczbę — brak imion.

### Zmiany

**1. Nowy RPC `get_user_location_points`** (SECURITY DEFINER, admin-only):
Zwraca po jednym rekordzie na użytkownika z profilu, w formie:
```
user_id, first_name, last_initial, city, country, street
```
gdzie `last_initial = LEFT(last_name, 1) || '.'`, `street = NULLIF(TRIM(address_street), '')` (użyję istniejącej kolumny adresu — zweryfikuję nazwę w `profiles` przy implementacji: `address`, `street`, `address_line1`). Grant tylko dla `authenticated`; wewnątrz sprawdzenie `has_role(auth.uid(),'admin')` — inne role nie dostają danych osobowych.

**2. Edge function `geocode-cities` — obsługa ulicy**:
Dodaję opcjonalne pole `street` w `items[]`. Klucz cache i klucz Nominatim rozszerzam o ulicę:
- gdy jest ulica → structured search `street=<ulica>&city=<miasto>&country=<kraj>`, cache pod kluczem `street|city|country`.
- gdy brak ulicy → dotychczasowa ścieżka (klucz `|city|country`).
Tabela `city_geocache` dostaje nową kolumnę `street text NOT NULL DEFAULT ''` i unique index `(street, city, country)` (migracja).

**3. Frontend `UserWorldMapWidget` + `UserWorldMap`**:
- Widget pobiera nowy RPC (per-user) zamiast agregatu; buduje `items` z `street|city|country` do geokodowania.
- Po geokodowaniu składam punkty per-user; jeżeli kilku użytkowników trafia na te same koordynaty, agreguję w jeden marker z listą osób i lekkim „jitterem" (±0.0002°) dla wizualnego rozdziału na najwyższym zoomie.
- **Popup markera**: nagłówek „Miasto, Kraj" (+ ulica, gdy znana), liczba użytkowników, i lista „Imię N." (do 20, potem „+X więcej"). Bez pełnych nazwisk, bez adresu domowego innego niż nazwa ulicy — zgodnie z prośbą.
- **Cluster**: dodaję `disableClusteringAtZoom: 12` i `spiderfyOnEveryZoom` na wysokich zoomach; klaster pokazuje sumę użytkowników.
- **Warstwa państw**: gdy zoom ≥ 6, ustawiam ją jako `interactive: false` (i chowam kontur) — nie przechwytuje wtedy kliknięć w markery. Przy niższym zoomie działa jak dziś (klik = przybliżenie kraju).

**4. Brak zmian w**: uploadzie logo, przełączniku klasyczna/satelita, widoku początkowym Europy.

### Prywatność
Pełne nazwiska nie wychodzą z bazy — RPC zwraca tylko `first_name` i inicjał. Adres pełny nigdy nie trafia do klienta; przekazujemy tylko nazwę ulicy do geokodera i cache'ujemy tylko współrzędne. RPC dostępne wyłącznie dla adminów.

### Pliki
- migracja SQL: nowa funkcja `get_user_location_points`, kolumna `street` w `city_geocache` + unikalny indeks.
- `supabase/functions/geocode-cities/index.ts` — obsługa `street`.
- `src/components/dashboard/widgets/UserWorldMapWidget.tsx` — nowe źródło danych.
- `src/components/admin/UserWorldMap.tsx` — per-user punkty, popup z listą imion, `disableClusteringAtZoom`, wyłączanie warstwy państw na wysokim zoomie.
