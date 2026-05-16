Problem na produkcji jest najpewniej w samym `react-simple-maps`: biblioteka nadal próbuje robić dynamiczne `projections[projection]()` i przy obecnym bundlu produkcyjnym potrafi skończyć jako `u[i] is not a function`. Żeby to nie wracało, usuwamy tę zależność z renderowania mapy.

Plan naprawy:

1. Przebudować `src/components/admin/UserWorldMap.tsx` tak, aby nie używał `react-simple-maps` w runtime:
   - render SVG zostaje,
   - mapę świata narysujemy bezpośrednio przez `d3-geo` + `topojson-client`,
   - kraje, kliknięcia, hover, zoom, reset i punkty użytkowników zostają zachowane.

2. Zostawić istniejące funkcje biznesowe:
   - pobieranie miast z `get_user_city_counts`,
   - geokodowanie przez `geocode-cities`,
   - granice miast po dużym przybliżeniu,
   - widoczność per rola i ustawienia z `dashboard_map_settings`,
   - Classic/Satellite toggle.

3. Usunąć źródło błędu produkcyjnego:
   - usunąć importy `ComposableMap`, `Geographies`, `Geography`, `ZoomableGroup`, `Marker`,
   - nie przekazywać już żadnego `projection` do `react-simple-maps`,
   - obliczać ścieżki mapy przez `geoPath(projection)` bez dynamicznego lookupu.

4. Dodać twarde zabezpieczenia, żeby widżet mapy nigdy nie wywalał pulpitu:
   - jeśli dane topo/geokodowanie/granice są puste lub wadliwe, renderować pustą, stabilną mapę zamiast błędu,
   - filtrować nieprawidłowe współrzędne,
   - ignorować wadliwe geometry zamiast rzucać wyjątek.

5. Zweryfikować po wdrożeniu w preview:
   - `/dashboard` nie pokazuje błędu widżeta,
   - mapa renderuje się w widoku głównym,
   - przełącznik Klasyczna/Satelitarna działa,
   - kontrolki zoom/reset nie powodują błędu.

Pliki do zmiany:
- `src/components/admin/UserWorldMap.tsx`

Bez zmian w bazie danych, RLS, ustawieniach mapy i logotypach.