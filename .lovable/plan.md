## Cel
Mapa w widżecie dashboardu ma ładować się bez błędu `u[i] is not a function`. Nie chcemy tylko ukrywać awarii — sama mapa ma renderować się stabilnie.

## Diagnoza
Błąd pasuje do `react-simple-maps`: biblioteka wywołuje projekcję jako funkcję z obiektu `d3-geo`. Jeśli przekazana nazwa projekcji nie zostanie poprawnie znaleziona albo bundler ją zminifikuje/nieudostępni tak, jak oczekuje biblioteka, pojawia się błąd typu `... is not a function`.

W `UserWorldMap.tsx` projekcja jest teraz przekazywana jako string:
- `projection="geoEquirectangular"`
- `projection="geoNaturalEarth1"`

To jest najbardziej prawdopodobna przyczyna błędu widocznego na dashboardzie.

## Plan naprawy
1. **Przestać przekazywać projekcję jako string**
   - W `UserWorldMap.tsx` importować jawnie funkcje projekcji z `d3-geo`: `geoEquirectangular` i `geoNaturalEarth1`.
   - Przekazywać do `<ComposableMap />` realną funkcję projekcji, nie nazwę tekstową.
   - Dzięki temu `react-simple-maps` nie będzie robił dynamicznego lookupu `projections[projection]()` i błąd `u[i] is not a function` zniknie u źródła.

2. **Ustabilizować render mapy**
   - Utworzyć `mapProjection` w `useMemo`, zależny od trybu mapy.
   - Użyć stałych `MAP_WIDTH` / `MAP_HEIGHT` zamiast ukrytych wartości `800/600`, także dla obliczania tekstury satelitarnej.
   - Dodać defensywne zabezpieczenia na geografie/klastry, żeby błędny kształt danych nie przerywał renderu.

3. **Naprawić lokalny ErrorBoundary widżetu**
   - W `DashboardFooterSection.tsx` zostawić izolację widżetu, ale poprawnie przekazać `fallback={null}` bez `as any`.
   - Jeśli mapa kiedyś napotka osobny problem, nie rozwali całego dashboardu, ale celem tej poprawki jest, żeby nie było fallbacku w normalnym działaniu.

4. **Zweryfikować wynik**
   - Sprawdzić, że `/dashboard` nie pokazuje już karty błędu.
   - Sprawdzić, że mapa renderuje się w widżecie i przełącznik Klasyczna/Satelitarna nadal działa.
   - Adminowa wersja mapy (`/admin?tab=user-stats`) pozostaje z pełnym nagłówkiem.

## Pliki do zmiany
- `src/components/admin/UserWorldMap.tsx`
- `src/components/dashboard/widgets/DashboardFooterSection.tsx`

## Bez zmian
- Nie ruszam bazy danych ani ustawień Supabase.
- Nie zmieniam logiki widoczności widżetu.
- Nie usuwam uploadu logo.