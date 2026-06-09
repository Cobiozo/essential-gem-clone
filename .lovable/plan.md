## Cel

Doszlifować widok gościa (rola `guest`): ograniczyć zakładki w „Moje konto", uprościć topbar i sidebar, ukryć większość widgetów na Pulpicie i ukryć baner instalacji PWA. Zmiany dotyczą wyłącznie warstwy prezentacji — żadne RLS / edge functions / dane nie są ruszane.

## Zakres zmian (UI only)

### 1. `src/pages/MyAccount.tsx` — zakładki dla gościa
W `visibleTabs` (linia ~239) dodać warunek roli `guest`:
- `profile: true`
- `security: true`
- wszystkie pozostałe (`teamContacts`, `notifications`, `preferences`, `aiCompass`, `hkCodes`, `reflinks`) wymuszone na `false` dla gościa.

Efekt: gość widzi tylko „Profil" i „Bezpieczeństwo".

### 2. Topbar nad stroną „Moje konto" (ikona dzwonka + „Akademia")
W `src/components/Header.tsx`:
- Ukryć pozycję „Akademia" (linia 238–242) dla gościa.
- Jeśli w nagłówku jest dzwonek powiadomień (zostanie zweryfikowany w build mode) — ukryć go dla gościa. Pozostawić: język, motyw, „Strona główna", „Wyloguj się".

### 3. Sidebar — `src/components/dashboard/UserProfileCard.tsx` + `DashboardSidebar.tsx`
- W `getRoleDisplayName` dodać case `'guest' → 'Gość'` (zamiast bieżącego fallbacku „Klient").
- W sidebarze dla gościa zostawić tylko trzy pozycje z ikonami (w tej kolejności):
  1. „Pulpit" → `/dashboard` (ikona `LayoutDashboard`)
  2. „Wsparcie" → istniejąca ścieżka wsparcia / kontaktu (np. `/support`) (ikona `LifeBuoy`)
  3. „Wyloguj się" przyklejone do dołu (ikona `LogOut`)
- Ukryć dla gościa pozostałe sekcje menu (Akademia, Biblioteka, itd.).

### 4. Dashboard widgety — `src/pages/Dashboard.tsx` + `useGuestVisibility`
Rozszerzyć `DEFAULT_GLOBAL.widgets` w `src/hooks/useGuestVisibility.ts` o klucze: `webinarInvite: false`, `calendar: true`, `myMeetings: false`, `trainingProgress: false`, `otpCodes: false`, `resources: false`, `teamContacts: false`, `reflinks: false`, `infoLinks: false`, `footer: false`, `searchSpecialist: false` (lupa PLC Omega Base / „search").

`Dashboard.tsx` już używa `showWidget(...)` — wystarczy upewnić się, że wszystkie te klucze są respektowane (są). Dodatkowo: jeśli lupa „PLC Omega Base" (pływający przycisk) jest renderowana poza Dashboard (FAB w layoucie), ukryć ją przez `useGuestVisibility` w komponencie FAB.

### 5. Nazwa widżetu kalendarza
W `CalendarWidget` zmienić tytuł z „Webinary i spotkania" na „Kalendarz wydarzeń" dla wszystkich, zgodnie z prośbą użytkownika (jednolity tytuł).
Pod kalendarzem: dla gościa ukryć legendę kolorowych kropek (Webinar / Spotkanie zespołu / Trójstronne / Konsultacje / EVENT) — gate przez `useGuestVisibility` (`active`).

### 6. „Zainstaluj aplikację" (PWA banner na dole Pulpitu)
Komponent banera (PWAInstall / InstallPage prompt renderowany w `DashboardFooterSection` lub osobno) — owinąć w `if (guestActive) return null`. Identyfikacja konkretnego pliku w build mode (najprawdopodobniej `src/components/.../PWAInstallBanner.tsx` lub w `DashboardFooterSection`).

## Szczegóły techniczne

- Rola sprawdzana przez `useAuth().userRole?.role === 'guest'` (już używane w `useGuestVisibility`).
- Wszystkie gate'y idą przez istniejący helper `useGuestVisibility` / `isVisible('widgets', key)` lub bezpośredni warunek `isGuest`.
- Brak zmian w bazie danych, RLS, edge functions, i18n nie wymaga aktualizacji (etykiety istnieją lub dodajemy stałą polską „Gość").

## Poza zakresem
- Logika rejestracji / aktywacji e-maila (już zrobiona w poprzednich turach).
- Zmiany backendowe / migracje.
