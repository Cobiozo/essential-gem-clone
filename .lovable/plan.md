## Cel

Dodać na pasku bocznym pulpitu zakładkę **„Weryfikacja biletów"** otwierającą dedykowaną stronę z **identyczną funkcjonalnością** jak zakładka „Weryfikacja" w panelu Eventy (wybór wydarzenia, lista uczestników, wyszukiwarka, skaner QR, ręczne wpisanie kodu, check‑in / check‑out, eksport). Dostęp ma mieć **admin** oraz **zalogowani użytkownicy, którym admin udzieli uprawnienia**.

## Co powstanie

### 1. Baza – nowa tabela uprawnień
- `public.ticket_verifier_access` (`user_id uuid PK`, `is_enabled boolean default true`, `granted_by uuid`, `granted_at timestamptz default now()`)
- GRANTy: `select, insert, update, delete` dla `authenticated`; `all` dla `service_role`
- RLS: użytkownik widzi tylko swój rekord; admin (`has_role`) ma pełen dostęp
- Funkcja `public.has_ticket_verifier_access(_user_id uuid) returns boolean` (SECURITY DEFINER, `SET search_path = public`) – zwraca `true` jeśli admin lub rekord w `ticket_verifier_access` z `is_enabled=true`

### 2. Backend – rozszerzenie istniejących edge functions
Obie funkcje obecnie sprawdzają wyłącznie rolę `admin`. Zmieniamy je tak, aby akceptowały również użytkowników z `ticket_verifier_access`:
- `supabase/functions/verify-event-ticket/index.ts` – zamiast `isAdmin` używamy `canVerify` (admin OR ticket_verifier_access). Logika check‑in / check‑out działa identycznie.
- `supabase/functions/admin-list-event-orders/index.ts` – ta sama zmiana autoryzacji (potrzebne do listy uczestników).

### 3. Frontend – nowa, dedykowana strona
- Wydzielenie **współdzielonego komponentu** `src/components/ticket-verification/TicketVerificationPanel.tsx` z obecnego `src/components/admin/paid-events/TicketVerification.tsx` (1:1 ta sama funkcjonalność: selektor wydarzenia, pole kodu + przycisk Sprawdź, skaner QR aparatem, lista uczestników z wyszukiwarką i licznikami, przyciski Check‑in / Cofnij check‑in per wiersz, eksport XLSX/DOC/HTML).
- Plik w `admin/paid-events/TicketVerification.tsx` staje się cienkim wrapperem nad nowym komponentem (zero zmian wizualnych w panelu admina).
- Nowa strona `src/pages/TicketVerificationPage.tsx` używająca `DashboardLayout` z tytułem **„Weryfikacja biletów"** i renderująca `TicketVerificationPanel` w „ładnym, profesjonalnym" wrapperze (gradientowy nagłówek z ikoną QR, karty z `bg-card/60 backdrop-blur`, te same tokeny co reszta pulpitu – bez własnych kolorów spoza design‑systemu).
- Route w `src/App.tsx`: `/weryfikacja-biletow` chroniony – wejdzie tylko admin lub użytkownik z aktywnym `ticket_verifier_access` (sprawdzenie po stronie klienta + ochrona w edge functions).

### 4. Sidebar – nowy element menu
- W `src/components/dashboard/DashboardSidebar.tsx` dodać pozycję `{ id: 'ticket-verification', icon: QrCode, labelKey: 'Weryfikacja biletów', path: '/weryfikacja-biletow' }`.
- Widoczność: nowy hook `useTicketVerifierAccess(userId)` (zwraca `{ canAccess, loading }` – admin lub rekord w `ticket_verifier_access` z `is_enabled=true`). Pozycja renderuje się tylko gdy `canAccess === true`.
- Umiejscowienie: zaraz pod „Eventy płatne" w bloku partnerskim/wspólnym, aby było logicznie blisko biletów.

### 5. Panel admina – nadawanie uprawnienia
- W istniejącym ekranie konfiguracji uprawnień użytkownika (tam, gdzie są pozostałe `*_user_access`) dodać **toggle „Weryfikacja biletów"**: upsert/delete w `ticket_verifier_access` z `granted_by = auth.uid()`.
- Wpis do `admin_activity_log` (`action: 'ticket_verifier_access_changed'`, `details` JSONB z `target_user_id` i `enabled`).
- Rozszerzyć `useUserPermissions.ts` o nową pozycję, aby było widać status uprawnienia w widoku „Moje uprawnienia" użytkownika.

## Bezpieczeństwo

- Edge functions pozostają **jedynym** źródłem prawdy dla check‑in/out – ukrycie pozycji w sidebarze to UX, realna autoryzacja odbywa się serwerowo (`has_role` admin **lub** `has_ticket_verifier_access`).
- RLS na `ticket_verifier_access` nie pozwala użytkownikowi nadać sobie dostępu – tylko admin może wstawiać/aktualizować rekordy innych.
- Brak zmian w już istniejących politykach `paid_event_orders` – odczyt listy uczestników nadal wyłącznie przez edge function (która sama waliduje uprawnienia).

## Czego NIE ruszamy

- Wygląd i logika zakładki „Weryfikacja" w panelu Eventy – pozostają nietknięte (dzielimy ten sam komponent, więc każda przyszła poprawka działa w obu miejscach).
- Generowanie biletów, e‑maile, PDF‑y, statusy zamówień.
