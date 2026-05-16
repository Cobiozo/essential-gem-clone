## Trzy zmiany

### 1) Usunięcie legendy „Liczba użytkowników"
W `src/components/admin/UserWorldMap.tsx` (linia ~594) jest blok legendy z kropkami 1/2/7. Usunąć cały ten element (wraz z otaczającym `<div className="absolute …">`).

### 2) Ukrycie „Zlokalizowano X/Y miast" i przycisku „Odśwież" w widżecie pulpitu
Te elementy są przydatne w panelu admina (`/admin?tab=user-stats`), ale na pulpicie zwykłego użytkownika są zbędne.

- W `UserWorldMap.tsx` dodać prop: `hideHeaderMeta?: boolean` (domyślnie `false`).
- Gdy `true` → ukryć:
  - licznik „Zlokalizowano … / … miast" i wskaźnik geokodowania,
  - przycisk „Odśwież".
- Toggle Klasyczna/Satelitarna **pozostawić**.
- W `src/components/dashboard/widgets/UserWorldMapWidget.tsx` przekazać `hideHeaderMeta={true}`.

### 3) Upload logo z komputera (działająca funkcja)
Poprzednia migracja została przerwana — brak kolumn `logo_left_url`, `logo_right_url` w `dashboard_map_settings` i brak bucketu `dashboard-map-logos`. Trzeba ją wykonać + dodać UI uploadu.

**a) Migracja DB + Storage:**
- `ALTER TABLE dashboard_map_settings ADD logo_left_url TEXT DEFAULT '<obecny Pure Life URL>'`
- `ADD logo_right_url TEXT DEFAULT '/lovable-uploads/eqology-ibp-logo.png'`
- Bucket publiczny `dashboard-map-logos` + policies (public SELECT, admin INSERT/UPDATE/DELETE).

**b) `useDashboardMapSettings.ts`:** rozszerzyć interfejs o `logo_left_url`, `logo_right_url`.

**c) `DashboardMapSettings.tsx`:** pod „Pokaż logo" dodać sekcję **„Logo (lewe / prawe)"** — dla każdego slotu:
- podgląd obrazka (lub placeholder „Brak logo"),
- przycisk **Wgraj plik** (`<input type="file" accept="image/*">`) → upload do `dashboard-map-logos/{left|right}/{timestamp}.{ext}` → `getPublicUrl` → zapis do draftu (toast „Wgrano"),
- pole tekstowe URL (edycja ręczna),
- przycisk **Usuń** (czyści URL).
URL-e zapisywane razem z resztą przyciskiem „Zapisz ustawienia".

**d) `UserWorldMap.tsx`:** dodać propsy `logoLeftUrl?`, `logoRightUrl?` i użyć ich w bloku `{showLogos && …}`. Jeśli `logoRightUrl` puste — bez separatora i prawego logo.

**e) `UserWorldMapWidget.tsx`:** przekazać `logoLeftUrl={settings.logo_left_url}` i `logoRightUrl={settings.logo_right_url}`.

## Brak regresji
- `/admin?tab=user-stats` zachowuje pełny nagłówek (brak `hideHeaderMeta`).
- Domyślne wartości URL-i logo = obecnie używane → bez zmian wizualnych po wdrożeniu.
- Tylko admin może wgrywać do bucketu (RLS).