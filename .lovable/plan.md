Problem: widżet mapy nadal może dawać zły efekt w produkcji, bo aktualny render opiera satelitę na obrazie SVG `<image>` z dynamicznym viewBox oraz ładuje punkty przez klientowe geokodowanie. To oznacza, że błąd assetu, przeglądarki, uprawnień Edge Function albo geokodowania może zepsuć odbiór całego widżetu.

Plan naprawy:

1. Ustabilizować sam render mapy
- Usunąć renderowanie satelity przez `<image href="/textures/earth-bluemarble-2k.jpg">` wewnątrz przesuwanego SVG.
- Zastąpić je bezpiecznym tłem CSS `<img>`/warstwą absolutną poza SVG, które nie wpływa na geometrię i nie może zepsuć ścieżek mapy.
- SVG zostawić wyłącznie do granic państw, markerów, tooltipów i kliknięć.
- Dodać stały fallback: jeśli tekstura albo dane geometrii nie załadują się poprawnie, widoczna ma być klasyczna mapa konturowa, a nie pusty/błędny widżet.

2. Dodać twardy ErrorBoundary bez ukrywania widżetu
- Obecnie `DashboardFooterSection` ma fallback pusty (`<></>`), więc przy błędzie widget znika.
- Zmienić fallback na stabilną, prostą mapę zastępczą z komunikatem neutralnym lub samą konturową grafiką, żeby „błędu widżeta mapy” nigdy nie było w UI.
- Błąd komponentu mapy nie ma wpływać na resztę pulpitu.

3. Oddzielić dane użytkowników od widoczności mapy
- `UserWorldMapWidget` ma zawsze pokazywać mapę, nawet jeśli `get_user_city_counts`, `geocode-cities` albo `geocode-city-boundary` zwrócą błąd/403/timeout.
- W takim przypadku mapa renderuje się bez kropek albo z ostatnim bezpiecznym pustym stanem, bez komunikatu błędu.
- Geokodowanie granic miast pozostawić opcjonalne i tylko jako dekorację przy dużym zoomie.

4. Usunąć pozostałości problematycznej zależności
- Usunąć `react-simple-maps` oraz `@types/react-simple-maps` z `package.json`, bo komponent już nie powinien z nich korzystać, a ich obecność może nadal trafiać do bundle/cache i mylić produkcyjną diagnostykę.
- Zostawić bezpośrednie `d3-geo`, `topojson-client`, `world-atlas`.

5. Zweryfikować po zmianach
- Sprawdzić `/dashboard` w podglądzie: mapa widoczna, tryb Klasyczna/Satelitarna działa, zoom/reset nie powodują błędów.
- Sprawdzić logi konsoli pod kątem błędów mapy.
- Sprawdzić request tekstury i funkcji geokodowania: awaria danych nie może już usuwać ani psuć mapy.

Zakres bez zmian:
- Bez zmian DB/RLS.
- Bez zmian ustawień admina mapy poza sposobem bezpiecznego renderowania.
- Bez zmian logiki ról i widoczności widżetu.