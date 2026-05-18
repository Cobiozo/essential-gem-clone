Problem jest w komponencie `UserWorldMap`: kliknięcie kraju liczy zbliżenie z granic SVG, ale na warstwie satelitarnej używany jest rzut equirectangular, który dla Francji obejmuje też terytoria zamorskie. Dlatego „Francja” może kadrować inne rejony świata zamiast samego państwa w Europie. Dodatkowo bieżące pobieranie granic miast może dorysowywać obszary administracyjne, ale nie powinno sterować kadrowaniem kraju.

Plan naprawy:

1. Dodać bezpieczne kadrowanie kraju po ISO
   - Dla wybranych państw użyć ręcznie zdefiniowanych granic kontynentalnych/państwowych, zaczynając od Francji: metropolitalna Francja bez terytoriów zamorskich.
   - Kliknięcie „Francja” ma zawsze przybliżać do obszaru Francji w Europie, nie do Gujany Francuskiej, Martyniki, Reunion itd.

2. Zostawić fallback dla pozostałych krajów
   - Jeśli kraj nie ma ręcznego zakresu, obecna logika `pathGen.bounds` zostaje jako zapas.
   - Nie zmieniam danych użytkowników, geokodowania miast ani innych modułów.

3. Poprawić widok po kliknięciu kraju
   - Wyliczyć środek i zoom z lon/lat bounding box, a nie z całej geometrii obejmującej terytoria zamorskie.
   - Zachować zaznaczenie kraju i filtrowanie markerów po `selectedIso`.

4. Ograniczyć efekt uboczny granic miast
   - Po kliknięciu kraju nadal pokażą się markery tylko dla tego kraju.
   - Granice administracyjne miast nie będą wpływać na centrum/zoom kraju.

5. Dodać krótką weryfikację
   - Sprawdzić w kodzie, że Francja mapuje się na `FR` i że kliknięcie używa nowego zakresu.
   - Jeśli preview pozwoli, sprawdzić zachowanie na mapie po kliknięciu „France”.

Efekt: kliknięcie w „France/Francja” będzie kadrować wyłącznie metropolitalną Francję, zamiast pokazywać inne tereny wynikające z geometrii terytoriów zamorskich.