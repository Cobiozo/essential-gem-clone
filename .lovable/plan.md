Plan naprawy widżetu mapy:

1. Cache danych mapy w `localStorage`
- Dodać cache dla wyniku RPC `get_user_city_counts` w `UserWorldMapWidget`.
- Po udanym RPC zapisywać ostatnie poprawne miasta wraz z timestampem.
- Jeśli RPC zwróci błąd, timeout albo brak dostępu, odczytać ostatni cache i nadal renderować mapę z zapisanymi punktami.
- Jeśli nie ma cache, renderować mapę bez punktów, ale bez crasha i bez znikania widżetu.

2. Cache geokodowania miast
- Dodać lokalny cache dla wyników `geocode-cities`, bo same city counts nie wystarczą do pokazania markerów po awarii Edge Function.
- Przy błędzie geokodowania używać ostatnich współrzędnych zapisanych w `localStorage` dla tych samych `city|country`.
- Po udanym geokodowaniu aktualizować cache współrzędnych.

3. Naprawa przesunięcia mapy względem konturów
- Przyczyną przesunięcia jest ręczne rozciąganie bitmapy satelitarnej przez punkty projekcji `[-180,85]` i `[180,-85]`, co nie pokrywa się 1:1 z pełnym equirectangular zakresem tekstury.
- Dla trybu satelitarnego wymusić spójną projekcję equirectangular o kontrolowanej skali i translate zamiast `fitSize` zależnego od konturów TopoJSON.
- Umieścić teksturę dokładnie w obszarze odpowiadającym `[-180,-90]` do `[180,90]`, a nie `[-180,85]` do `[180,-85]`.
- Kraje, granice i markery zostaną liczone tą samą projekcją, więc kontury i bitmapa będą zbieżne.

4. Ulepszone mobile pinch/drag
- Zastąpić obecne pojedyncze `dragRef` obsługą aktywnych pointerów w `Map<number, point>`.
- Jeden palec: płynne przesuwanie mapy.
- Dwa palce: pinch zoom liczony z dystansu między palcami oraz pan według środka gestu.
- Zoom będzie zachowywać punkt pod palcami możliwie stabilnie zamiast tylko zmieniać `zoom` środka widoku.
- Dodać bezpieczne anulowanie animacji przy ręcznym geście i stabilne `pointer capture/release`.

5. Stabilizacja na produkcji
- Ograniczyć stan widoku przez `clampView`, żeby pan/zoom nie wyjeżdżał poza sensowne granice mapy.
- Poprawić `wheel zoom`, aby zoomował wokół kursora, nie środka mapy.
- Zachować istniejące przełączniki, logo, markery, filtrowanie kraju i fallback ErrorBoundary.

Zakres zmian: frontend tylko w `UserWorldMapWidget.tsx` i `UserWorldMap.tsx`; bez zmian w bazie, RLS, rolach ani Supabase functions.