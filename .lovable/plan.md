# Poprawki dla roli „Gość"

## 1. Migający „Pulpit" w pasku bocznym
**Problem:** Przed załadowaniem roli i konfiguracji widoczności gościa, sidebar renderuje pełną listę menu, a po załadowaniu filtruje ją do whitelisty gościa. Powoduje to mignięcie „Pulpitu".

**Fix w `src/components/dashboard/DashboardSidebar.tsx`:**
- Dodać do destrukturyzacji `useGuestVisibility()` flagę `loading`.
- W bloku renderującym `<SidebarMenu>` — jeśli `userRole` jeszcze nie istnieje, lub jeśli aktywny jest tryb gościa (`guestActive`) i `loading === true` — renderować pustą listę (bez itemów). Dopiero po wczytaniu pokazać `visibleMenuItemsForGuest`.
- Dodatkowo wymusić, by `dashboard` zawsze był widoczny dla gościa (whitelist), niezależnie od ewentualnej konfiguracji `sidebar.items.dashboard=false`. W filtrze `visibleMenuItemsForGuest` zwracać `true` dla `item.id === 'dashboard'` przed sprawdzeniem `gv(...)`.

## 2. Lupa „PLC Omega Base" / czat AI w prawym dolnym rogu
**Plik:** `src/components/MedicalChatWidget.tsx`
- Dołączyć `isGuest` z `useAuth()` i zmienić `hasAccess` na:
  `user && !isGuest && (isAdmin || isPartner || isClient || isSpecjalista)`.
- (Zabezpieczenie redundantne wobec aktualnej logiki, ale gwarantuje brak widoczności dla gościa w razie posiadania jednej z innych ról.)

## 3. Ikony społecznościowe w stopce sidebaru — nie widoczne dla gościa
**Plik:** `src/components/dashboard/DashboardSidebar.tsx` (useEffect `fetchVisibility`, filtr ikon)
- Rozszerzyć filtr `sidebar_footer_icons`, aby gość („guest") był traktowany jak klient: `if ((role === 'client' || role === 'user' || role === 'guest') && icon.visible_to_client) return true;`
- Dzięki temu admin nie musi dodawać nowej kolumny — ikony włączone dla klienta będą widoczne także dla gościa.

## 4. Globalne usunięcie napisu „Płatne szkolenia i wydarzenia"
**Plik:** `src/pages/PaidEventsListPage.tsx`
- W nagłówku `<h1>Eventy</h1>` usunąć cały wiersz `<p>{tf('events.paidTrainings', ...)}</p>`.

## 5. Zmiana nagłówka „Twój link partnerski do tego wydarzenia"
**Plik:** `src/components/paid-events/MyEventFormLinks.tsx`
- W `headerTitle` (gdy `eventId` jest ustawione) zmienić tekst na: **„Twój link zapraszający na to wydarzenie"**.
- Wersja bez `eventId` (lista wszystkich) pozostaje bez zmian (jest tam liczba mnoga – „Moje linki partnerskie do formularzy rejestracyjnych"), chyba że również ma być zmieniona — jeśli tak, zaktualizuję analogicznie do „Moje linki zapraszające na wydarzenia".

## Pliki do edycji
- `src/components/dashboard/DashboardSidebar.tsx` (pkt 1, 3)
- `src/components/MedicalChatWidget.tsx` (pkt 2)
- `src/pages/PaidEventsListPage.tsx` (pkt 4)
- `src/components/paid-events/MyEventFormLinks.tsx` (pkt 5)

Brak zmian w bazie danych ani RLS.
