## Plan naprawy

### 1) Upload logo lewego i prawego
- Zostawię istniejący publiczny odczyt bucketu `dashboard-map-logos`.
- Dodam drugą warstwę zapisu przez tabelę pomocniczą `dashboard_map_logo_uploads`, bo obecne polityki `storage.objects` wyglądają już poprawnie, a błąd nadal wskazuje na blokadę RLS podczas realnego uploadu.
- Utworzę bezpieczne zasady dostępu:
  - zalogowany użytkownik może dodać rekord uploadu tylko dla siebie,
  - odczyt może być publiczny tylko na potrzeby publicznego logo,
  - usuwanie/edycja pozostają ograniczone do właściciela lub admina.
- W kodzie uploadu dodam jawne sprawdzenie aktywnej sesji przed wysyłką, lepszy komunikat błędu oraz bardziej unikalną nazwę pliku, żeby upload lewego i prawego logo działał tak samo.

### 2) Domyślny tryb mapy
- Ustawię wartość domyślną w bazie dla `dashboard_map_settings.default_mode` na `satellite`.
- Zaktualizuję istniejący rekord ustawień widżetu na `satellite`, żeby aktualny widget od razu startował w trybie satelitarnym.
- W panelu admina zostanie obecny przełącznik „Klasyczna / Satelitarna”, więc admin nadal będzie mógł zmienić domyślny tryb.

### 3) Zachowanie w UI
- Nie zmienię obecnego przybliżania kraju ani powrotu po odznaczeniu — nadal będzie używany aktualny startowy widok mapy.
- Nie zmienię innych widgetów ani globalnych ustawień panelu.

## Szczegóły techniczne
- Migracja Supabase obejmie domyślny `default_mode = 'satellite'` oraz pomocniczą tabelę uploadów z RLS.
- Frontend zmienię głównie w `DashboardMapSettings.tsx`: sprawdzenie `supabase.auth.getSession()`, obsługa błędów RLS i zapis URL po udanym uploadzie.
- Startowy tryb mapy nadal będzie przekazywany z `settings.default_mode` do `UserWorldMap`.