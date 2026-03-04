

## Plan: Zmiana logo i zmniejszenie odstępu

### 1. Dodanie nowego logo do projektu
Skopiować plik `user-uploads://Projekt_bez_nazwy_1.png` do `src/assets/pure-life-droplet-new.png`.

### 2. Zmniejszenie odstępu między logo a napisem "Pure Life Team" (`HeroSection.tsx`)
W sekcji logo (linia 103-116) zmniejszyć `mb-4 sm:mb-6` na `mb-1 sm:mb-2` gdy jest tekst, aby logo było bliżej napisu pod spodem.

### 3. Zmiana logo na stronie logowania (`Auth.tsx`)
Linia 756 — zamienić `newPureLifeLogo` na nowy import `pure-life-droplet-new.png`.

### 4. Zmiana logo w sidebarze dashboardu (`DashboardSidebar.tsx`)
Linia 658 — zamienić `newPureLifeLogo` na nowy import `pure-life-droplet-new.png`.

### 5. Zmiana logo w sidebarze admina (`AdminSidebar.tsx`)
Linia ~230 — zamienić `newPureLifeLogo` na nowy import.

### Zakres plików
- Nowy plik: `src/assets/pure-life-droplet-new.png`
- `src/components/HeroSection.tsx` — zmniejszenie gap
- `src/pages/Auth.tsx` — nowe logo
- `src/components/dashboard/DashboardSidebar.tsx` — nowe logo
- `src/components/admin/AdminSidebar.tsx` — nowe logo

