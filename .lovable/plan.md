## Cel
Gość ma widzieć dodatkowo: sekcję „Zespół Pure Life" + „Kontakt" w stopce pulpitu, ikony przy pozycjach sidebara oraz pozycję „Eventy" w sidebarze. W /paid-events gość widzi tylko wydarzenia, które admin wyraźnie dla niego/grupy gości włączył (np. „Business Opportunity Meeting Łódź"). Po wejściu w wydarzenie widzi je tak jak partner — z możliwością wygenerowania własnego linku partnerskiego i podglądu własnego biletu.

## Zmiany

### 1. Stopka pulpitu (Zespół + Kontakt) — widoczna dla gościa
`src/hooks/useGuestVisibility.ts`
- W `DEFAULT_GLOBAL.widgets` ustawić `footer: true` (zamiast `false`).
- Dodać nowe podflagi: `footerQuote: false`, `footerMap: false`, `footerTeam: true`, `footerContact: true`, `footerBottom: true` (bottom = pasek z logo/copyright/privacy/regulamin/cookies, BEZ „Zainstaluj aplikację" — `pwaInstall` pozostaje false).

`src/components/dashboard/widgets/DashboardFooterSection.tsx`
- Dodać `useGuestVisibility()`; gdy `guestActive`, ukrywać sekcje wg flag:
  - cytat/misja → `footerQuote`
  - mapa świata → `footerMap`
  - Zespół Pure Life → `footerTeam`
  - Kontakt → `footerContact`
  - dolny pasek → `footerBottom`, a w nim przycisk „Zainstaluj aplikację" gated `pwaInstall`.

### 2. Sidebar — ikony i pozycja „Eventy"
`src/components/dashboard/DashboardSidebar.tsx`
- Ikony już są renderowane dla wszystkich (gość je widzi). Brak zmiany kodu — potwierdzić podczas testu.
- Dodać do `GUEST_ID_TO_KEY`: `'paid-events': 'paidEvents'`.
- Dotychczasowe filtry (m.in. `isPaidEventsVisible`) muszą przepuścić gościa — patrz hook niżej.

`src/hooks/useGuestVisibility.ts`
- `sidebar.items`: dodać `paidEvents: true`.

`src/hooks/usePaidEventsVisibility.ts` (jeśli ogranicza role)
- Dodać obsługę roli `guest`: jeśli aktywny `guest` i flaga `sidebar.items.paidEvents` w guest config = true → moduł widoczny. (Implementacja: zwracać `true` gdy `userRole === 'guest'`; finalna gatekeeping per-event w punkcie 3.)

### 3. /paid-events — whitelista wydarzeń per gość
Wykorzystać istniejący `guest_visibility_overrides.config.events.items[eventId] = true` (oraz globalne `guest_visibility_global.config.events.items`).

`src/pages/PaidEventsListPage.tsx`
- Pobrać `useGuestVisibility()`. Jeśli `guestActive`:
  - Filtrować `upcomingEvents`/`pastEvents`: zachować tylko te, dla których `gv('events', event.id)` zwraca `true`.
  - Ukryć sekcję „Zakończone" jeśli pusta (już jest taki guard).
  - Nagłówek bez zmian.

### 4. Strona pojedynczego wydarzenia — bez zmian funkcjonalnych
- Gość po kliknięciu „Zobacz" widzi standardową stronę wydarzenia (`/paid-events/:slug`) — ten sam komponent co partner.
- Generowanie linku partnerskiego: w `PaidEventCard` / podstronie wydarzenia mechanizm linku partnerskiego dla zalogowanych użytkowników działa po `user.id` — gość (rola `guest`) ma `auth.users` id, więc otrzyma działający ref-link. Weryfikuję istniejący komponent „Mój link partnerski" i — jeżeli jest gated rolą (`isPartner`/`isAdmin`) — rozszerzam warunek o `userRole === 'guest'`.
- „Mój bilet": panel `MyEventTicketsInline` w `PaidEventCard` działa po `user.id`, więc gość zobaczy własne bilety automatycznie. Bez zmian.

### 5. Panel admina — edytor widoczności gościa
`src/components/admin/guest-visibility/*` (jeśli istnieje)
- Dodać przełączniki dla nowych kluczy: `widgets.footerTeam`, `widgets.footerContact`, `widgets.footerQuote`, `widgets.footerMap`, `widgets.footerBottom`, `sidebar.items.paidEvents`.
- W zakładce „Eventy" dla gościa zapewnić listę wydarzeń płatnych z togglami → zapisuje do `guest_visibility_global.config.events.items` (globalnie dla wszystkich gości) oraz w edytorze per-user do `guest_visibility_overrides.config.events.items` (np. konkretny gość widzi tylko BOM Łódź).

## Szczegóły techniczne
- Brak migracji DB ani zmian RLS — używamy istniejących tabel `guest_visibility_global` i `guest_visibility_overrides` oraz scope `events` już zdefiniowanego w hooku.
- Logika filtrowania w PaidEventsList korzysta z `isVisible('events', event.id, false)` — domyślnie ukryte; admin musi wprost włączyć każde wydarzenie dla gościa.
- Ref-link partnerski opiera się o `?ref=<user_id>`/`?ref=<eq_id>` — sprawdzę istniejący helper i odblokuję dla roli `guest`.

## Out of scope
- Mechanika prowizji od linku partnerskiego gościa (oddzielne ustawienie biznesowe — wymagałoby decyzji, czy gość uczestniczy w prowizjach).
- Zmiany w mailingach / bilecie.
