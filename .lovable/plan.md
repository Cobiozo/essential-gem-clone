# Plan — 2 zmiany w panelu admina

## 1) Konfigurowalna kolejność pozycji menu bocznego (sidebar)

Admin w panelu CMS będzie mógł drag-and-drop ustawiać kolejność pozycji w `DashboardSidebar` (Pulpit, Akademia, Baza wiedzy, Biblioteka, PureBox, Pure-Kontakty, Aktualności, Wydarzenia, Eventy, Weryfikacja biletów, PureLinki, Moja Strona, Ustawienia, Wsparcie, Admin, itd.).

### Co powstanie
- Nowa tabela `sidebar_menu_order` (single-row, `id boolean PK = true`):
  - `order jsonb` — tablica ID pozycji w preferowanej kolejności (np. `["dashboard","academy","news",...]`)
  - `updated_at timestamptz`
  - RLS: SELECT dla `anon` + `authenticated`, UPDATE/INSERT tylko admin (przez `has_role`), ALL dla `service_role`. GRANT-y zgodne z polityką.
- Hook `src/hooks/useSidebarMenuOrder.ts` — pobiera kolejność + realtime subscribe; eksportuje `order: string[]`, `save(order)`.
- Komponent admin `src/components/admin/SidebarOrderEditor.tsx`:
  - Lista pozycji z `@hello-pangea/dnd` (już używane w projekcie, np. mobileNav) — drag-and-drop sortable.
  - Pokazuje wszystkie znane ID + ikonę + etykietę.
  - Przycisk „Przywróć domyślną kolejność".
  - Zapis do tabeli.
- Wpięcie w `NewsHubAdminPage` / globalny panel admin — dodam nową zakładkę „Menu boczne" w istniejącej stronie admin (np. `/admin` → nowa karta „Menu boczne"), bez ruszania pozostałych modułów. Konkretne miejsce: nowa karta w `src/pages/AdminPage.tsx` (zweryfikuję dokładne miejsce przy implementacji).
- Modyfikacja `src/components/dashboard/DashboardSidebar.tsx`:
  - Pobiera `order` z hooka i sortuje `visibleMenuItems` wg. tej kolejności (pozycje spoza listy lądują na końcu w domyślnej kolejności — tak działają np. nowe dynamiczne strony HTML).
  - Filtrowanie ról / widoczności pozostaje bez zmian — sortowanie nakłada się jedynie na finalną listę.

### Zakres
- Dotyczy tylko sidebara desktop/mobile (`DashboardSidebar`).
- Submenu (np. PureBox → „Ocena umiejętności") **nie** jest sortowalne w tej iteracji (można dodać później jeśli będzie potrzeba).
- Ustawienie globalne dla wszystkich ról (jeden wspólny porządek). Per-rola — wykluczone w tej iteracji.

## 2) Nowy układ edytora banera Centrum Aktualności

Obecnie podgląd banera w `NewsHubBannerEditor` jest na górze, a wszystkie opcje pod spodem (scroll). Zmiana:

- Layout dwukolumnowy (`grid lg:grid-cols-[1fr_420px] gap-4`):
  - **Lewa kolumna — Podgląd na żywo (sticky)**: `<NewsHubBanner config={local} />` zamknięty w karcie z `position: sticky; top: 80px` — pozostaje widoczny podczas scrollowania prawej kolumny.
  - **Prawa kolumna — Opcje**: wszystkie sekcje (Włącz baner, Treść tytuł/podtytuł/CTA, Obraz tła + upload + fit + pozycja + wysokość, Nakładka kolor/krycie/gradient, Typografia kolory/wyrównanie/rozmiar) w jednym scrollowanym pionowym stacku.
  - Przycisk „Zapisz baner" w prawej kolumnie — sticky na dole, zawsze dostępny.
- Na ekranach `< lg` (mobile/tablet) — fallback do układu jednokolumnowego: podgląd nad opcjami (jak dziś), żeby zachować ergonomię.
- Zero zmian w logice zapisu, schemacie tabeli `news_hub_banner_config` i komponencie `NewsHubBanner` — tylko reorganizacja `NewsHubBannerEditor.tsx`.

## Pliki

**Nowe**
- `supabase/migrations/<ts>_sidebar_menu_order.sql`
- `src/hooks/useSidebarMenuOrder.ts`
- `src/components/admin/SidebarOrderEditor.tsx`

**Edytowane**
- `src/components/dashboard/DashboardSidebar.tsx` — sortowanie pozycji wg. zapisanej kolejności.
- `src/pages/AdminPage.tsx` (lub odpowiednia strona admina) — dodanie zakładki „Menu boczne".
- `src/components/admin/news-hub/NewsHubBannerEditor.tsx` — nowy układ dwukolumnowy z sticky preview.
- `src/integrations/supabase/types.ts` — typy nowej tabeli (regenerowane).
