
# Rejestracja gościa + edytor widoczności dla admina

## Cel
Osoby spoza struktury (nie partner, nie klient, nie specjalista) mogą zarejestrować się przez link wygenerowany przez admina jako **gość**. Gość podlega wyłącznie adminowi. Admin globalnie definiuje co widzi domyślny gość, a dodatkowo może dla każdego konta gościa nadpisać widoczność per element (sidebar, topbar, widgety pulpitu, banery, pozycje menu avatara, sekcje pulpitu).

## Zakres modułów dostępnych dla gościa (twardo zablokowane reszty)
Gość NIGDY nie widzi modułów wymagających danych konta partnera/struktury:
- ❌ CRM, downline, prowizje, kalkulatory prowizji
- ❌ Akademia partnerska, Leader Panel, Platform Teams
- ❌ Spotkania indywidualne, Auto‑Webinar BO/HC, Broadcast
- ❌ Strony partnerskie, PureBox, Test Bank, MyPartnerPage
- ❌ Czat (role chat, DM, broadcast), zaproszenia, organizacja

Admin może włączyć tylko moduły "neutralne":
- ✅ Pulpit główny (wybrane widgety)
- ✅ News Hub (Aktualności) – z poszanowaniem istniejącej widoczności per‑post
- ✅ Healthy Knowledge / Knowledge Center (publiczne zasoby)
- ✅ Wybrane strony CMS (`html_pages` z flagą)
- ✅ Wybrane eventy publiczne (lista, bez rejestracji partnerskiej)
- ✅ Banery (`important_info_banners`, `app_banners`) – per item
- ✅ Profil/Moje konto (ograniczony: tylko dane podstawowe, email, hasło, język, wylogowanie)

## Rejestracja
- Nowy publiczny route `/zaproszenie/:token` (token z `guest_invite_links`).
- Formularz: email, hasło, imię, nazwisko, zgody RODO/Regulamin (jak w obecnym profile completion).
- Brak MFA, brak Guardian/Leader, brak przypisania do zespołu.
- Tworzy `auth.users` + `profiles` + `user_roles` z nową rolą `guest`.
- Po zalogowaniu: redirect na `/dashboard` jak każda inna rola, ale renderowane przez **GuestDashboardShell** (osobny shell – nie ryzykujemy wycieków z partner UI).

## Model danych

### Nowa rola `guest` w enum `app_role`
Dodanie wartości `'guest'`. Wszystkie istniejące `has_role()` checki nadal działają (gość zwraca false dla partner/specjalista/client/admin).

### Tabele
```text
guest_invite_links
  id, token (unique), label, is_active,
  expires_at, max_uses, used_count,
  created_by, created_at

guest_visibility_global              -- jedna konfiguracja, domyślna dla wszystkich gości
  id (singleton), config jsonb, updated_at, updated_by

guest_visibility_overrides           -- nadpisania per gość
  id, user_id (unique), config jsonb,
  updated_at, updated_by
```

### Kształt `config jsonb`
```json
{
  "sidebar": { "items": { "dashboard": true, "news": true, "knowledge": false, ... } },
  "topbar":  { "sound": true, "notifications": true, "language": true, "theme": false,
               "tutorial": false, "chat": false, "calendar": false, "switchClassic": false },
  "avatarMenu": { "home": true, "myAccount": true, "settings": true,
                  "apiSync": false, "toolPanel": false, "logout": true },
  "widgets": { "newsBanner": true, "infoBanners": true, "map": false,
               "newsTicker": true, "introVideo": false, ... },
  "banners": { "items": { "<banner_id>": true, ... }, "allowAll": false },
  "pages":   { "html": { "<page_id>": true, ... } },
  "events":  { "showPublicList": true, "items": { "<event_id>": true } }
}
```
Override w `guest_visibility_overrides.config` to **częściowy** patch nad globalem (merge głęboki – override zwycięża per‑klucz).

### RLS / GRANT
- `guest_invite_links`: SELECT public po tokenie przez SECURITY DEFINER `resolve_guest_invite(token)`; pełny CRUD tylko admin.
- `guest_visibility_global`: SELECT dla `authenticated`, UPDATE/INSERT tylko admin.
- `guest_visibility_overrides`: SELECT `auth.uid() = user_id OR is_admin()`; CRUD tylko admin.

## Edytor admina – „Goście" (nowa zakładka w `/admin?tab=guests`)

Trzy podzakładki:

1. **Linki zaproszeń** – lista, generowanie nowego (label, ważność, limit użyć, aktywny/nie), kopiowanie URL.
2. **Konfiguracja globalna** – panel checkbox pogrupowany w sekcje:
   - Sidebar (lista z `useSidebarMenuOrder` z zaznaczeniem „dostępne dla gościa")
   - Topbar (lista ikon z `DashboardTopbar`)
   - Menu avatara (pozycje dropdown)
   - Widgety pulpitu (z `useDashboardWidgets`)
   - Banery (z `important_info_banners`, `app_banners`, `news_hub_banner_config`)
   - Strony CMS (`html_pages` z flagą "dopuszczalne dla gościa")
   - Eventy publiczne
   - Plus przycisk **„Podgląd jako gość"** → otwiera `/dashboard?preview=guest` w nowej karcie.
3. **Lista gości** – tabela kont z rolą `guest`. Wiersz → modal „Indywidualne ustawienia widoczności" pokazujący ten sam panel checkboxów z dodatkowym stanem trójwartościowym: *Dziedzicz z globalnego / Pokaż / Ukryj*.

### Tryb „Podgląd jako gość"
- Rozszerzenie istniejącego `visibilityUtils.PreviewRole` o `'guest'`.
- Admin na pulpicie z `?preview=guest&guestId=<opt>` widzi UI dokładnie tak jak gość (global + ewentualne nadpisania konkretnego konta).
- Przy każdym przełączalnym elemencie pojawia się mała ikona „oka" (toggle) – kliknięcie zapisuje zmianę do globalnej lub indywidualnej konfiguracji (zależnie od kontekstu wybranego w pasku trybu podglądu).
- Pasek trybu podglądu (sticky bottom) z wyborem: *Globalnie / Dla konkretnego gościa*, link „Wyjdź z podglądu".

## Implementacja frontu

### Nowe pliki
- `src/pages/GuestRegister.tsx` – formularz `/zaproszenie/:token`
- `src/components/dashboard/GuestDashboardShell.tsx` – uproszczony shell renderujący tylko dozwolone widgety
- `src/components/admin/guests/GuestsTab.tsx` (+ `InviteLinksList.tsx`, `GuestGlobalConfig.tsx`, `GuestUsersList.tsx`, `GuestVisibilityPanel.tsx`, `GuestPreviewToolbar.tsx`)
- `src/hooks/useGuestVisibility.ts` – pobiera global + override (jeśli zalogowany gość), zwraca `isVisible(scope, key)`
- `src/hooks/useGuestInvite.ts` – walidacja tokenu, zużycie

### Modyfikacje istniejące
- `src/contexts/AuthContext.tsx` – dodać `isGuest`, redirect logikę dla `guest` (omija MFA, profile completion).
- `src/components/layout/AppSidebar.tsx`, `DashboardTopbar.tsx`, dropdown avatara, `DashboardWidgets`, `BannerHost`, `PaidEventsList` itp. – każdy element opakować w `useGuestVisibility().isVisible(...)`. Dla NIE‑gościa hook zwraca zawsze `true` (brak narzutu logiki).
- `src/App.tsx` `PUBLIC_PATHS` – dodać `/zaproszenie/:token`.
- `src/lib/visibilityUtils.ts` – `PreviewRole` += `'guest'`.
- Edge function `guest-redeem-invite` – atomowe zużycie tokenu i utworzenie roli (service role), żeby uniknąć race po stronie klienta.

## Bezpieczeństwo
- Gość nie pojawia się w żadnym query partnerskim (CRM, downline, struktury): wszystkie istniejące RLS już filtrują po `role = 'partner'` / `'specjalista'` / `'client'`. Po dodaniu `'guest'` do enum musimy zweryfikować polityki które używają `role <> 'admin'` aby nie wpuściły gościa tam gdzie nie powinien być – w migracji audyt i ew. zacieśnienie do białej listy ról.
- `has_role(auth.uid(), 'partner'|'client'|...)` zwróci false – funkcje wymagające tych ról automatycznie blokują gościa.
- Edge functions admin‑only już używają `has_role(_,'admin')` – bez zmian.

## Migracja (kolejność)
1. `ALTER TYPE app_role ADD VALUE 'guest';`
2. CREATE TABLE + GRANT + RLS dla 3 nowych tabel (`guest_invite_links`, `guest_visibility_global`, `guest_visibility_overrides`).
3. `INSERT` początkowego rekordu `guest_visibility_global` z minimalnym, bezpiecznym configiem.
4. SECURITY DEFINER `resolve_guest_invite(token text)` + `consume_guest_invite(token text, user_id uuid)`.
5. Audyt istniejących RLS pod kątem gościa (raport w logach migracji).

## Wynik dla użytkownika
- Admin: nowa zakładka **Goście** w panelu admina → generuje linki, ustawia co każdy gość widzi, w razie potrzeby personalizuje per konto, ma tryb podglądu „jako gość".
- Gość: rejestruje się przez link, ląduje na pulpicie wyglądającym tak jak realny, ale ograniczonym wyłącznie do tego co dopuścił admin.
