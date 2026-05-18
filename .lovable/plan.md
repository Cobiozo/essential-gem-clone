## Cel

Dodać dwupoziomową kontrolę widoczności News Hub:

1. **Poziom modułu** (`/aktualnosci`): admin włącza/wyłącza moduł per rola (admin/partner/client/specjalista) oraz dodatkowo dla wybranych pojedynczych użytkowników (override).
2. **Poziom artykułu**: każdy post może być oznaczony jako „publiczny dla wszystkich" lub „ograniczony" — wtedy widoczny tylko dla wybranych ról i/lub konkretnych użytkowników.

Wzorzec: identyczny jak istniejący PureBox (`purebox_settings` + `purebox_user_access`).

## Zmiany w bazie

### A. Widoczność modułu News Hub
Rozszerzamy istniejącą tabelę `news_hub_settings` (1 wiersz, `id=true`) o:
- `is_active boolean default true` — master toggle
- `visible_to_admin/partner/client/specjalista boolean default true`

Nowa tabela `news_hub_user_access`:
- `user_id uuid` (FK do `auth.users`), `is_enabled boolean default true`, unique `(user_id)`
- RLS: każdy zalogowany widzi swój wpis; admin zarządza wszystkimi.

### B. Widoczność per artykuł
Na `news_hub_posts` dodajemy:
- `visibility_mode text default 'public'` — `'public'` lub `'restricted'`
- `visible_to_admin/partner/client/specjalista boolean default true` (używane tylko gdy `restricted`)

Nowa tabela `news_hub_post_user_access`:
- `post_id uuid` (FK do `news_hub_posts` on delete cascade), `user_id uuid`, unique `(post_id, user_id)`
- RLS: admin zarządza, użytkownik widzi swoje wpisy.

### C. Funkcja RLS i polityki
- `has_news_post_access(_post_id uuid, _user uuid) returns boolean` — `SECURITY DEFINER`, `SET search_path = public`. Sprawdza po kolei: rola=admin → true; `visibility_mode='public'` → true; `restricted` → match po roli LUB obecność w `news_hub_post_user_access`.
- Aktualizujemy politykę `news_hub_posts_select_published`: dodatkowo wymagamy `has_news_post_access(id, auth.uid())` (admin nadal widzi wszystko).

## Zmiany w kodzie

### Hooki
- **`useNewsHubVisibility`** (nowy, wzór `usePureBoxVisibility`):
  - Pobiera `news_hub_settings` + `news_hub_user_access` dla aktualnego usera.
  - `isModuleVisible()` → boolean (master + rola + override).
  - Używany w `NewsHubPage`, w pozycji menu „Centrum Aktualności" i w pasku „News Ticker".
- **`useNewsHubSettings`** rozszerzony o nowe pola modułowe i ich `save…`.
- **`useNewsHub.ts`** — `useNewsHubPosts` po pobraniu listy filtruje wynik po `visibility_mode`/rola/user (DB i tak chroni, ale UI ma natychmiastowy efekt).

### UI admina
- **`NewsHubAdminPage`** — nowa sekcja **„Widoczność modułu"**:
  - Master switch (włączony/wyłączony moduł).
  - 4 switche per rola.
  - Picker użytkowników z dodatkowym dostępem (multi-select po e-mail/nazwie, lista typu `user_roles` + `profiles`).
- **`PostFormDialog`** + **`PostInlineEditor`** — nowa zakładka/sekcja **„Widoczność"**:
  - Radio: `public` / `restricted`.
  - Gdy `restricted`: 4 switche per rola + picker konkretnych użytkowników (lista `news_hub_post_user_access` per post).

### Ukrywanie wejść w UI gdy moduł wyłączony
- Link do `/aktualnosci` w nawigacji i kafelek na dashboardzie pokazujemy tylko gdy `isModuleVisible()`.
- Bezpośrednie wejście pod `/aktualnosci` przy braku dostępu → komunikat „Brak dostępu" (nie crash).

## Czego nie zmieniamy

- Schemat bloków, edytor treści, kategorie — bez zmian.
- Panel `/admin/news-hub` pozostaje dostępny tylko dla `admin` (jak teraz).

## Plik artefaktów

- Migracja: `supabase/migrations/<ts>_news_hub_visibility.sql` (tabele, kolumny, RLS, funkcja `has_news_post_access`).
- Nowy hook: `src/hooks/useNewsHubVisibility.ts`.
- Edycje: `useNewsHubSettings.ts`, `useNewsHub.ts`, `NewsHubAdminPage.tsx`, `PostFormDialog.tsx`, `PostInlineEditor.tsx`, `NewsHubPage.tsx` + miejsce(a) z linkiem do `/aktualnosci`.
