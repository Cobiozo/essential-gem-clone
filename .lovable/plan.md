# Plan: Mobile zoom mapy + dolny pasek nawigacji (CMS)

## 1. Mobile — startowy zoom mapy satelitarnej na Europę

**Plik:** `src/components/admin/UserWorldMap.tsx`

Obecnie `DEFAULT_ZOOM_SATELLITE = 5.5` jest stały dla wszystkich urządzeń — na telefonie mapa wygląda za daleko (widać Afrykę i pół Atlantyku).

Zmiana:
- Wykryć urządzenie mobilne hookiem `useIsMobile()` (już istnieje w `src/hooks/use-mobile.tsx`).
- Na mobile: `DEFAULT_ZOOM_SATELLITE = 9` i `DEFAULT_ZOOM_CLASSIC = 9` z centrum `[15, 52]` (sama Europa, jak na screenie).
- Na desktopie zostaje obecne 5.5 / 6.0 z centrum `[15, 50]`.
- Reset view przy zmianie breakpointa (dodać `isMobile` do deps `defaultView`).

Bez zmian w panelu admina — to tylko default startowy widok, użytkownik dalej może oddalać/przybliżać.

## 2. Dolny pasek szybkiej nawigacji (mobile webapp)

### Model danych (nowa tabela)

```sql
create table public.mobile_bottom_nav_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  icon_name text not null,        -- nazwa ikony z lucide-react
  target_path text not null,      -- np. /dashboard, /messages, /events
  position int not null default 0,
  is_active boolean not null default true,
  visible_to_client boolean not null default true,
  visible_to_partner boolean not null default true,
  visible_to_specjalista boolean not null default true,
  visible_to_leader boolean not null default true,
  visible_to_admin boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.mobile_bottom_nav_items enable row level security;

-- SELECT: każdy zalogowany
-- INSERT/UPDATE/DELETE: tylko admin (has_role(auth.uid(),'admin'))
```

Seed: 5 startowych pozycji (Dashboard, Wiadomości, Eventy, Akademia, Profil) — admin może później zmienić.

### Panel CMS dla admina

**Nowy plik:** `src/components/admin/MobileBottomNavSettings.tsx`
- Lista pozycji z drag&drop (reorder po `position`), edycja inline: label, ikona (picker z lucide), ścieżka, widoczność per rola, on/off.
- Walidacja: minimum 5 aktywnych pozycji (admin nie może zapisać <5).
- Podgląd na żywo (mini-mockup paska).

Wpięcie do istniejącego panelu admina (tam gdzie obecne ustawienia, np. obok `DashboardMapSettings` / footer settings — wskazać dokładne miejsce zakładki "Pulpit" / "Wygląd").

### Komponent paska na mobile

**Nowy plik:** `src/components/layout/MobileBottomNav.tsx`
- Renderowany tylko gdy `useIsMobile()` true (i nie na publicznych ścieżkach typu landing/auto-webinar).
- Fixed `bottom-0 left-0 right-0`, `z-50`, `safe-area-inset-bottom` (iOS notch).
- Pobiera pozycje z nowej tabeli (`useMobileBottomNav()` hook + realtime subscribe), filtruje po roli usera.
- Każda pozycja: ikona (`lucide-react` dynamicznie z `icon_name`) + label pod spodem (text-xs). Aktywna pozycja podświetlona kolorem primary.
- Pokazuje max 5 (jeśli admin doda więcej, scroll horyzontalny lub trim do 5 — ustalmy: pokazujemy wszystkie, równomierny flex).

### Wpięcie globalne

**Plik:** `src/App.tsx` (lub odpowiedni Layout) — dorzucić `<MobileBottomNav />` na końcu drzewa po routach chronionych. Dodać `padding-bottom: 72px` do głównego kontenera na mobile, żeby content nie chował się pod paskiem (np. utility class na `<main>`).

Czat PiP / floating buttons — przesunąć w górę o wysokość paska na mobile, żeby się nie nakładały (lekka korekta `bottom-*` w odpowiednich komponentach).

### Memory do zapisania

Po wdrożeniu: nowy plik `mem://features/mobile-bottom-nav` z opisem tabeli, hooka, miejsca renderu i regułą "min 5 pozycji".

## Pytanie do potwierdzenia

1. Czy ikony pobieramy z `lucide-react` (picker po nazwie), czy admin ma wgrywać własne PNG/SVG? Lucide jest szybsze i spójne — sugeruję lucide.
2. Czy pasek ma być widoczny też na publicznych stronach (landing partnera, auto-webinar guest), czy tylko po zalogowaniu? Sugeruję tylko po zalogowaniu.
