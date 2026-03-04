

## Plan: Zmiana logo w stopkach na nową złotą kroplę

### 1. Stopka strony głównej (`Footer.tsx`)
Zamienić import `pure-life-droplet.png` na `pure-life-droplet-new.png` (linia 2).

### 2. Stopka dashboardu (`DashboardFooterSection.tsx`)
Zamienić import `pure-life-logo-new.png` na `pure-life-droplet-new.png` (linia 4).

### 3. Header — logo z bazy danych
Logo w nagłówku (`Header.tsx`) jest pobierane dynamicznie z tabeli `system_texts` w bazie danych (pole `site_logo`). Aby je zmienić, trzeba zaktualizować URL logo w panelu administracyjnym (sekcja „Logo strony") lub wykonać UPDATE w bazie. Mogę zaktualizować je bezpośrednio w bazie, jeśli chcesz.

### Zakres plików
- `src/components/homepage/Footer.tsx` — zmiana importu logo
- `src/components/dashboard/widgets/DashboardFooterSection.tsx` — zmiana importu logo

