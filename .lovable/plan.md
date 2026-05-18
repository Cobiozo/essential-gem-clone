
# Dodanie wejść do modułu News Hub w nawigacji

Moduł istnieje (`/aktualnosci` + `/admin/news-hub`), ale nie ma do niego żadnego linku w UI – stąd niewidoczność.

## Zmiany

1. **Admin sidebar** (`src/components/admin/AdminSidebar.tsx`) – nowa pozycja „Centrum aktualności" → `/admin/news-hub` (ikona `Newspaper`), w grupie Treści/CMS obok istniejących stron CMS.

2. **Dashboard sidebar** (`src/components/dashboard/DashboardSidebar.tsx`) – nowa pozycja „Aktualności" → `/aktualnosci` (ikona `Newspaper`) dla wszystkich zalogowanych użytkowników, w grupie głównej lub Wiedza.

3. **Mobile bottom nav registry** (`src/components/admin/mobileNavRegistry.ts`) – dodać `{ label: 'Aktualności', path: '/aktualnosci', iconName: 'Newspaper', group: 'Główne' }`, aby admin mógł wpiąć do dolnego paska mobile.

4. **Routing whitelist** – sprawdzić `KNOWN_APP_ROUTES` i `PUBLIC_PATHS` (jeśli wymagane) – upewnić się, że `/aktualnosci` i `/admin/news-hub` są wpisane, aby uniknąć redirectów. (zalogowane, więc nie public).

5. **Stara strona CMS „Aktualności"** – pozostawić bez zmian w tej iteracji (użytkownik może ręcznie ukryć w CMS); nie ruszam, by nie wyjść poza zakres.

Bez zmian w logice biznesowej, hooks ani komponentach News Hub – tylko punkty wejścia w nawigacji.
