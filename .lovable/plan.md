## 1. Przybliżenie mapy satelitarnej = jak na screenie

W `src/components/admin/UserWorldMap.tsx`:
- Zmienić `DEFAULT_ZOOM_SATELLITE` z `9.0` na `5.5` (obecna wartość 9.0 zbytnio zoomuje na środek Europy; screen pokazuje cały kontynent od Hiszpanii po zachodnią Rosję).
- Wyśrodkować na `projection([15, 50])` zamiast `[15, 52]` (lepsze dopasowanie pionowe do screena, gdzie widać też Włochy i Hiszpanię).
- `DEFAULT_ZOOM_CLASSIC` zostawić bez zmian (6.0).

Reset mapy i odznaczenie kraju nadal będą wracać do tego widoku (kod już używa `defaultView`).

## 2. Edycja tekstu "Zmieniamy życie i zdrowie ludzi na lepsze" + podtytułu

Tekst nie jest w kodzie — siedzi w bazie w tabeli `dashboard_footer_settings`:
- `quote_text` → "Zmieniamy życie i zdrowie ludzi na lepsze"
- `mission_statement` → "Naszą misją jest wspieranie każdego w drodze do lepszego życia…"

Edytować można w panelu admina:

**Admin → zakładka „Stopka pulpitu" (Dashboard Footer)** — obsługiwane przez komponent `DashboardFooterManagement.tsx` (zarejestrowany w `Admin.tsx` jako `TabsContent value="dashboard-footer"`).

Bez żadnych zmian w kodzie — to już istniejący edytor.

## Pliki do zmiany
- `src/components/admin/UserWorldMap.tsx` — tylko 2 stałe (zoom + środek).

Brak zmian w bazie, brak zmian w innych komponentach.
