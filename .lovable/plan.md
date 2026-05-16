## 1) Naprawa: brak przekierowania po zapisaniu danych

**Przyczyna:** Po `handleSaveAddress` (oraz innych zapisach w `MyAccount.tsx`) nie unieważniamy zapytania `['profile-fields-banner-profile', user.id]`, które `ProfileFieldsBanner` używa do liczenia brakujących pól. Logika `wasIncomplete → navigate('/dashboard')` nigdy się nie uruchamia, bo `missing.length` zostaje > 0 aż do `staleTime` (30 s).

**Fix:** w `src/pages/MyAccount.tsx` po każdym udanym `update` profilu wywołać:
- `queryClient.invalidateQueries({ queryKey: ['profile-fields-banner-profile', user.id] })`
- dotyczy: zapis danych adresowych, danych osobowych, telefonu, EQ ID itd.

Dzięki temu `ProfileFieldsBanner` przeliczy `missing`, trafi w gałąź `wasIncomplete.current && location.pathname.startsWith('/my-account')` i wykona `navigate('/dashboard')`.

## 2) Rozbudowa banera: wiele konfigurowalnych banerów uniwersalnych

Zamiast jednego banera „uzupełnij dane” — system wielu banerów do dowolnych komunikatów (uzupełnienie danych, ogłoszenia, akcje marketingowe, linki do szkoleń, zewnętrzne strony itd.).

### Model danych

Nowa tabela `app_banners` (zastępuje pojedynczy rekord `profile_completion_banner_config`, stary zostaje jako fallback do migracji):

- `id`, `created_at`, `updated_at`
- `enabled` (bool)
- `priority` (int, malejąco — wyższy = wcześniej)
- `title`, `message`, `button_label`
- `severity` (`info|warning|destructive|success`)
- `dismissible` (bool)
- `style_variant` (`soft|solid|outline|gradient`) — nowe warianty wizualne
- `accent_color` (hex, opcjonalny custom kolor)
- `icon_name` (lucide ikona do wyboru: AlertCircle, Info, Bell, Sparkles, Gift, Calendar, BookOpen, ExternalLink, …)
- `target_url` (TEXT) — dowolna ścieżka wewnętrzna (`/dashboard`, `/leader-panel`) **lub** zewnętrzny URL (`https://…`)
- `open_in_new_tab` (bool) — domyślnie `true` dla zewnętrznych
- `audience_type` (`all | missing_profile_fields | role | specific_users`)
- `required_fields` (text[]) — używane gdy `audience_type='missing_profile_fields'`
- `target_roles` (text[]) — używane gdy `audience_type='role'`
- `target_user_ids` (uuid[]) — używane gdy `audience_type='specific_users'`
- `starts_at`, `ends_at` (timestamptz, opcjonalne — okno czasowe wyświetlania)
- `hide_on_paths` (text[]) — np. `['/auth','/install']`

RLS:
- SELECT: każdy zalogowany (klient sam filtruje widoczność wg audience)
- INSERT/UPDATE/DELETE: tylko admin (`has_role(auth.uid(),'admin')`)

### Frontend — `ProfileFieldsBanner` → `AppBanners`

Nowy komponent `src/components/banners/AppBanners.tsx`:
- pobiera wszystkie `enabled` banery
- filtruje wg: ścieżki (`hide_on_paths`), okna czasowego, audiencji (rola, lista użytkowników, brakujące pola profilu)
- sortuje po `priority`
- renderuje listę pasujących banerów (stack pionowy nad `{children}` w `DashboardLayout`)
- każdy baner ma:
  - dynamiczną ikonę z `lucide-react` po `icon_name`
  - klasy stylu wg `style_variant` + `severity` + opcjonalny `accent_color` (jako inline `--banner-accent`, ale przez tokeny CSS, nie surowe kolory w komponentach)
  - przycisk CTA:
    - jeśli `target_url` zaczyna od `/` → `navigate(target_url + '?highlight=…')` (highlight tylko dla audience `missing_profile_fields`)
    - inaczej → `<a href target="_blank" rel="noopener noreferrer">`
  - dismiss per-baner w `sessionStorage` kluczem `app-banner-dismissed-{id}`

Zachowane: auto-redirect na `/dashboard` po uzupełnieniu wszystkich wymaganych pól (tylko dla banerów `audience_type='missing_profile_fields'`).

Stary `ProfileFieldsBanner.tsx` zostaje jako cienki wrapper renderujący `AppBanners` (kompatybilność importów) — lub usuwamy i podmieniamy import w `DashboardLayout.tsx`.

### Admin UI — `src/components/admin/AppBannersManager.tsx`

Zastępuje `ProfileCompletionBannerSettings` (przycisk „Uzupełnij brakujące kraje” zostaje, przeniesiony do osobnej karty).

- Lista banerów: tabela z kolumnami (Tytuł, Audiencja, Cel, Priorytet, Włączony, Akcje)
- Drag-and-drop sortowanie priorytetu (lub strzałki ↑↓ — prościej)
- Modal/formularz tworzenia i edycji z polami:
  - Podstawowe: tytuł, treść, label przycisku, włączony, dismissible, priorytet
  - Wygląd: severity (select), style_variant (select z podglądem), accent_color (color picker, opcjonalny), ikona (grid lucide do wyboru)
  - **Cel przycisku:** input URL (z helperem „Ścieżka wewnętrzna np. `/leader-panel` lub pełny URL np. `https://…`”) + checkbox `open_in_new_tab`
  - Widoczność: select audience_type → warunkowo pokazuje:
    - `missing_profile_fields` → checkboxy pól (jak obecnie)
    - `role` → multi-select ról
    - `specific_users` → user picker (autocomplete po email/imię)
    - `all` → bez dodatkowych pól
  - Harmonogram: starts_at, ends_at (datetime-local), hide_on_paths (tag input)
  - **Podgląd na żywo** w prawej kolumnie modalu (renderowany `AppBanners`-like komponent z bieżących wartości formularza)

### Pliki

**Nowe:**
- migracja: tabela `app_banners` + RLS + seed z istniejącej konfiguracji
- `src/components/banners/AppBanners.tsx`
- `src/components/admin/AppBannersManager.tsx`
- `src/components/admin/banner-editor/` (formularz, podgląd, audience pickers, icon picker)

**Zmieniane:**
- `src/pages/MyAccount.tsx` — invalidate banner query po zapisach
- `src/components/dashboard/DashboardLayout.tsx` — render `AppBanners` zamiast `ProfileFieldsBanner`
- `src/components/admin/ProfileCompletionBannerSettings.tsx` — zastąpione przez `AppBannersManager` w zakładce admin
- `src/integrations/supabase/types.ts` — auto po migracji

### Szczegóły techniczne

- Wszystkie kolory przez tokeny `index.css` / `tailwind.config.ts`; `accent_color` jako opcjonalna nadpiska przez CSS variable `--banner-accent` ustawiana inline tylko na korzeniu banera (zgodnie z zasadami design systemu).
- Walidacja URL po stronie klienta (zod): albo ścieżka zaczynająca się od `/`, albo pełny `https://`/`http://`.
- Zewnętrzne linki zawsze z `rel="noopener noreferrer"`.
- Cache: `useQuery(['app-banners'])` z `staleTime: 60s` + realtime subscribe na zmiany (opcjonalnie; minimum to invalidate po zapisie w adminie).

Czy zatwierdzasz? Po akceptacji wykonuję migrację, potem implementuję frontend.