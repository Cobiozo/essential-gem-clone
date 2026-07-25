## Plan wdrożenia

1. **Pełne polskie etykiety na mapie**
   - Zmienię popup po kliknięciu kraju tak, aby używał polskiej nazwy z GeoJSON (`NAME_PL`) zamiast angielskiej (`Poland`, `Germany`).
   - Ujednolicę teksty w popupach i przy najmniejszych markerach: `użytkownik/użytkowników`, `miasto`, `kraj`, `więcej`, bez angielskich nazw z danych mapy.

2. **Znaczniki po otwarciu najmniejszych clusterów**
   - Po maksymalnym rozbiciu klastra / kliknięciu najmniejszych punktów popup ma pokazywać czytelną listę: miasto, kraj, liczba osób oraz imię + pierwsza litera nazwiska.
   - Jeżeli w jednym punkcie jest wiele osób, lista pozostanie przewijalna i nie będzie rozpychać mapy.

3. **Kod pocztowy jako warunek rozróżniania miast o tej samej nazwie**
   - Rozszerzę typ danych mapy o `postal_code`.
   - Zaktualizuję RPC `get_user_location_points()` tak, aby zwracało `postal_code` z profilu użytkownika.
   - Zaktualizuję widget mapy, grupowanie i geokodowanie tak, aby klucz lokalizacji był oparty o:
     ```text
     miasto + kraj + kod pocztowy, jeśli kod pocztowy istnieje
     miasto + kraj, jeśli kodu pocztowego brak
     ```
   - Edge Function `geocode-cities` dostanie `postalCode` i przekaże go do Nominatim jako część zapytania. Dzięki temu miejscowości o tej samej nazwie będą rozróżniane kodem pocztowym, ale użytkownicy bez kodu nadal będą działać na poziomie miasta.

4. **Trwały żółty kontur wybranego kraju**
   - Dodam stan/refs dla aktywnie wybranego kraju.
   - Po kliknięciu kraju jego granica zostanie żółta i pozostanie widoczna do kliknięcia innego kraju lub resetu mapy.
   - Poprawię `mouseout`, żeby nie kasował stylu aktywnego kraju.

5. **Dokładniejsze odzwierciedlenie granic**
   - Obecny plik `countries-110m.geojson` jest uproszczony, więc nie daje idealnego konturu przy przybliżeniu.
   - Zamienię albo dołożę dokładniejszy plik granic, np. `countries-50m.geojson` z Natural Earth, i użyję go dla warstwy klikanej/podświetlanej.
   - Granice satelitarne pozostaną widoczne, ale nie będą przechwytywać kliknięć markerów.

6. **Weryfikacja**
   - Sprawdzę w podglądzie: przełącznik klasyczna/satelitarna, klik w Polskę, trwały żółty kontur, polskie nazwy w popupach oraz popup najmniejszego punktu/klastra.
   - Zweryfikuję, że kod pocztowy przechodzi od RPC przez frontend do Edge Function i cache geokodowania.

## Pliki do zmiany

- `src/components/admin/UserWorldMap.tsx`
- `src/components/dashboard/widgets/UserWorldMapWidget.tsx`
- `src/components/admin/UserStatistics.tsx` jeśli korzysta z tego samego typu punktów mapy
- `supabase/functions/geocode-cities/index.ts`
- nowa migracja Supabase aktualizująca `get_user_location_points()`
- potencjalnie `public/geo/countries-50m.geojson` jako dokładniejsza warstwa granic