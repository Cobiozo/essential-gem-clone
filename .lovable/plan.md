# Plan: Ustawienia widżetu mapy w panelu admina

## 1) Nowa tabela `dashboard_map_settings` (singleton)

Migracja Supabase — jeden wiersz konfiguracji globalnej:

- `id uuid PK`
- **Widoczność:** `is_enabled bool` (master on/off), `visible_to_client/partner/specjalista/leader/admin bool`
- **Wymiary:** `width text` (`full` | `two_thirds` | `half`), `height_px int` (300–800)
- **Wygląd:** `default_mode text` (`classic` | `satellite`), `marker_color text` (hex), `show_logos bool`
- **Tytuł:** `show_title bool`, `title text`
- `updated_at`, `updated_by`

RLS: SELECT dla `authenticated` (każdy musi odczytać żeby wiedzieć czy renderować), UPDATE/INSERT tylko dla `has_role(auth.uid(),'admin')`. Seed jednego wiersza z domyślnymi wartościami.

## 2) Hook `useDashboardMapSettings.ts`

`src/hooks/useDashboardMapSettings.ts` — pobiera singleton, eksponuje `settings`, `loading`, `updateSettings()`. Realtime subscription na zmiany (od razu odświeża widżet u wszystkich).

## 3) Panel admina

`src/components/admin/DashboardMapSettings.tsx` — formularz z:
- Switch „Włącz widżet"
- 5× checkbox per rola
- Select szerokości (Pełna / 2/3 / 1/2)
- Slider wysokości 300–800 px z live preview
- Select trybu domyślnego (klasyczny/satelitarny)
- Color picker koloru kropek (hex input + swatch)
- Switch „Pokaż logo Pure Life + Eqology"
- Switch „Pokaż tytuł" + input edycji tytułu
- Przycisk „Zapisz"

Wstrzyknięcie do `src/pages/Admin.tsx` w zakładce `user-stats` — sekcja nad istniejącą `<UserWorldMap />` (collapsible „Ustawienia widżetu pulpitu").

## 4) Refaktor `UserWorldMap.tsx`

Dodanie propsów sterujących z ustawień (bez zmiany dotychczasowego zachowania w adminie):
- `initialMode?: 'classic' | 'satellite'`
- `markerColor?: string` (nadpisuje czerwony/primary w `<Marker><circle>` i w legendzie)
- `showLogos?: boolean` (overlay top-left)
- `showTitle?: boolean`, `customTitle?: string`
- `compact?: boolean` (mniejsza wysokość/legenda dla pulpitu)

Domyślne wartości = obecne zachowanie (zero regresji w `/admin?tab=user-stats`).

## 5) Refaktor `UserWorldMapWidget.tsx`

- Pobiera `settings` z hooka
- Jeśli `!is_enabled` lub rola użytkownika nie ma uprawnień → zwraca `null`
- Mapuje `width` na klasę grid: `full` → `col-span-full`, `two_thirds` → `lg:col-span-2`, `half` → `lg:col-span-1` (siatka pulpitu już ma `grid-cols-3` w stopce — sprawdzić w `DashboardFooterSection.tsx`)
- Przekazuje `markerColor`, `showLogos`, `showTitle`, `customTitle`, `initialMode`, `height_px` do `UserWorldMap`

## 6) `DashboardFooterSection.tsx`

Bez zmian strukturalnych — `UserWorldMapWidget` już tam jest. Jedyna zmiana: usunięcie hardcoded `h-[420px]` (wysokość teraz z ustawień).

## 7) Bez regresji

- `/admin?tab=user-stats` mapa działa jak teraz (props opcjonalne, defaulty = obecne)
- Tryb klasyczny pozostaje domyślny w localStorage użytkownika, ale `initialMode` z ustawień wymusza domyślny przy pierwszym wejściu
- RLS: tylko admin może edytować; każdy zalogowany widzi (potrzebne do decyzji o renderze)
- Brak nowych edge functions

## Weryfikacja

1. `/admin?tab=user-stats` → sekcja „Ustawienia widżetu pulpitu" → zmiana koloru/szerokości/widoczności
2. `/dashboard` → widżet renderowany zgodnie z ustawieniami, ukryty jeśli rola wyłączona
3. Realtime: zmiana w adminie odświeża pulpit innego użytkownika bez reloadu
