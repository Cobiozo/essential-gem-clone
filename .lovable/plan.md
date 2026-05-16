## Cel

W panelu „Widżet mapy na pulpicie — ustawienia", pod przełącznikiem **Pokaż logo**, dodać sekcję z podglądem **obu logo** (lewe + prawe) oraz możliwością ich wgrania/zmiany przez admina. Te same logo będą wyświetlane na widżecie mapy (zamiast aktualnie zahardkodowanych URL-i Pure Life i Eqology IBP).

## Zmiany

### 1) Migracja DB — `dashboard_map_settings`
Dodać dwie kolumny tekstowe (URL-e do logo):
- `logo_left_url TEXT` — domyślnie obecny URL Pure Life
- `logo_right_url TEXT` — domyślnie `/lovable-uploads/eqology-ibp-logo.png`

### 2) Storage — bucket `dashboard-map-logos` (public)
- INSERT do `storage.buckets` (id=`dashboard-map-logos`, public=true).
- Polityki:
  - SELECT: publiczny odczyt (bucket_id = 'dashboard-map-logos')
  - INSERT/UPDATE/DELETE: tylko `has_role(auth.uid(),'admin')`

### 3) Hook `useDashboardMapSettings.ts`
- Rozszerzyć interfejs `DashboardMapSettings` o `logo_left_url` i `logo_right_url`.

### 4) `DashboardMapSettings.tsx` — nowa sekcja „Logo (lewe / prawe)"
Renderowana **bezpośrednio pod** kartą „Pokaż logo" (wewnątrz sekcji **Wygląd**). Dla każdego z dwóch slotów (Lewe / Prawe):
- Podgląd obrazka (na ciemnym tle, h-12, object-contain) lub placeholder „Brak logo".
- Pole tekstowe URL (do ręcznej edycji).
- Przycisk **Wgraj** (`<input type="file" accept="image/*">`) → upload do bucketu `dashboard-map-logos` pod ścieżką `left/{timestamp}.{ext}` lub `right/{timestamp}.{ext}` → `getPublicUrl` → zapis do draftu.
- Przycisk **Usuń** (czyści URL).
- Sekcja jest wygaszona (`opacity-50 pointer-events-none`) gdy `show_logos = false`.

Zapis URL-i razem z resztą ustawień (istniejący przycisk **Zapisz ustawienia**).

### 5) `UserWorldMap.tsx`
- Dodać propsy `logoLeftUrl?: string` i `logoRightUrl?: string`.
- W bloku `{showLogos && (...)}` użyć tych propsów (fallback do obecnych hardcodów dla zgodności wstecznej w `/admin?tab=user-stats`).
- Jeśli `logoRightUrl` puste → renderować tylko lewe (bez separatora).

### 6) `UserWorldMapWidget.tsx`
- Przekazać `logoLeftUrl={settings.logo_left_url}` i `logoRightUrl={settings.logo_right_url}` do `<UserWorldMap />`.

### 7) `types.ts` (Supabase)
- Po zatwierdzeniu migracji wygeneruje się automatycznie nowy typ tabeli.

## Brak regresji
- Domyślne wartości URL-i = aktualnie używane logo → wygląd mapy bez zmian po wdrożeniu.
- `/admin?tab=user-stats` nadal pokazuje mapę bez propsów logo (fallback hardcode).
- RLS uploadu logo: tylko admin może zapisywać do bucketu.

## Punkty techniczne
- Bucket public, więc `getPublicUrl` zwraca URL nadający się do `<img src>`.
- Akceptowane: PNG/JPG/SVG/WEBP; brak twardego limitu rozmiaru po stronie klienta (rekomendacja w UI: ≤200KB).
- Nazewnictwo plików zawiera timestamp → unikamy cache'owania starego obrazu po podmianie.