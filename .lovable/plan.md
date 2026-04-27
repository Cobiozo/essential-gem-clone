## Cel

Rozszerzyć **PureBox → Moje Testy** do pełnoprawnego modułu **„Baza testów"** — miejsca, w którym partner zarządza testami swoimi i klientów, otrzymuje przypomnienia o odbiorze wyniku po ~25 dniach oraz o teście porównawczym po ~120 dniach. Motto: **„Testuję, nie zgaduję"**.

---

## Decyzje (potwierdzone)

1. Klient: wymagane tylko **Imię i Nazwisko**. E-mail opcjonalny — jeśli podany, włącza możliwość powiadomień mailowych do klienta.
2. Powiadomienia mailowe do klienta: opcjonalne, włączane togglem **„Powiadom też klienta mailem"** (widoczny tylko gdy jest e-mail).
3. Termin **+120 dni** liczony od `test_date` (data wykonania testu).
4. „Testy klientów" — widoczne wyłącznie w Bazie testów (bez integracji z innymi modułami w tej iteracji).

---

## Zmiany funkcjonalne

### 1. Rebranding zakładki
- Sidebar (PureBox): „Moje Testy" → **„Baza testów"**.
- Nagłówek strony: „Baza testów Omega" + motto „Testuję, nie zgaduję".
- Route `/moje-testy` zostaje + alias `/baza-testow`.

### 2. Dwie zakładki górne
- **Moje testy** — dotychczasowy widok (oś czasu, KPI, wykresy, historia) — bez utraty danych i logiki.
- **Testy klientów** — nowa lista klientów + szczegóły testów.

### 3. Klient w bazie testów
- Karta z: Imię i Nazwisko (wymagane), E-mail (opcjonalny), Telefon (opcjonalny), notatka.
- Status cyklu: `Test wręczony` → `Test wykonany` → `Wynik wprowadzony` → `Test porównawczy zaplanowany`.
- Wyniki klienta: te same pola co u partnera (Omega-3 Index, Omega-6:3, AA, EPA, DHA, LA + notatka, data testu).
- Sekcja przypomnień (per test):
  - **+25 dni** od `test_date` — „Wynik powinien być gotowy do pobrania, skontaktuj się z klientem".
  - **+120 dni** od `test_date` — „Czas na test porównawczy — pełen obraz efektu kuracji omega-3".
  - Toggle **„Powiadom mnie"** (in-app + e-mail partnera).
  - Toggle **„Powiadom też klienta mailem"** — aktywny tylko gdy klient ma e-mail.
- Wykres porównawczy (Test 1 vs Test 2) po wprowadzeniu drugiego wyniku — reuse `OmegaTrendChart`.

### 4. Powiadomienia
- W aplikacji: wpis w `user_notifications` (dzwoneczek) w dniu przypomnienia.
- E-mail do partnera: zawsze gdy włączony toggle „Powiadom mnie".
- E-mail do klienta: opcjonalnie, gdy włączony toggle i klient ma e-mail.
- Codzienny CRON (Edge Function `process-omega-test-reminders`) wysyła zaległe przypomnienia, używa `warsawLocalToUtc`.

---

## Zmiany techniczne

### Baza danych (migracje)
1. Nowa tabela `omega_test_clients`:
   - `id uuid pk`, `user_id uuid` (właściciel), `first_name text not null`, `last_name text not null`, `email text`, `phone text`, `notes text`, `is_active bool default true`, `created_at`, `updated_at`.
   - RLS: `user_id = auth.uid()` (full).
2. Rozszerzenie `omega_tests`:
   - `client_id uuid references omega_test_clients(id) on delete cascade` (nullable; NULL = test partnera).
   - `test_handed_date date` (nullable).
   - `reminder_25d_enabled bool default true`.
   - `reminder_120d_enabled bool default true`.
   - `notify_partner_email bool default true`.
   - `notify_client_email bool default false`.
   - `reminder_25d_sent_at timestamptz`.
   - `reminder_120d_sent_at timestamptz`.
   - Indeks: `omega_tests(client_id)`, `omega_tests(test_date) where client_id is not null`.
3. RLS `omega_tests` — pozostaje `user_id = auth.uid()`.

### Frontend
- `src/pages/OmegaTests.tsx` — `Tabs`: „Moje testy" / „Testy klientów".
- Nowy hook `src/hooks/useOmegaTestClients.ts` — CRUD klientów + agregaty (liczba testów, ostatnia data, najbliższe przypomnienie).
- `src/hooks/useOmegaTests.ts` — rozszerzyć o filtr `clientId` (`scope: 'self' | 'client'`).
- Nowe komponenty w `src/components/omega-tests/`:
  - `ClientList.tsx` — siatka kart, search, filtr statusu, przycisk „Dodaj klienta".
  - `ClientFormDialog.tsx` — Imię/Nazwisko (wymagane), E-mail, Telefon, notatka.
  - `ClientDetailDrawer.tsx` — dane klienta + lista testów + sekcja „Dodaj wynik testu" + wykres porównawczy + sekcja przypomnień per test.
  - `ClientReminderSettings.tsx` — toggles 25d/120d, powiadom mnie, powiadom klienta (disabled gdy brak emaila), podgląd dat.
- Sidebar: zmiana etykiety w `SidebarNav` (PureBox → „Baza testów").
- Routing: dodać alias `/baza-testow` w `App.tsx` + `KNOWN_APP_ROUTES`.

### Edge Function `process-omega-test-reminders` (CRON dziennie)
- Pobiera testy z `client_id IS NOT NULL`.
- Dla `reminder_25d_enabled` i `test_date + 25d <= today` i `reminder_25d_sent_at IS NULL`:
  - tworzy `user_notifications` dla partnera (jeśli `notify_partner_email`),
  - wysyła e-mail do partnera (jeśli `notify_partner_email`),
  - wysyła e-mail do klienta (jeśli `notify_client_email` i `email IS NOT NULL`),
  - ustawia `reminder_25d_sent_at = now()`.
- Analogicznie dla `+120d` (`reminder_120d_*`).
- Treści e-maili w PL (krótkie, brand-aligned).
- Cron co 06:00 Europe/Warsaw (przez `warsawLocalToUtc`).

### i18n / teksty
- Klucze: `purebox.testBank.title`, `purebox.testBank.motto`, `tabs.myTests`, `tabs.clientTests`, `client.add`, `client.empty`, `reminder.25d`, `reminder.120d`, `reminder.notifyMe`, `reminder.notifyClient`.

---

## Pliki do utworzenia / edycji

**Nowe:**
- migracja SQL (tabela `omega_test_clients` + kolumny w `omega_tests`).
- `src/hooks/useOmegaTestClients.ts`
- `src/components/omega-tests/ClientList.tsx`
- `src/components/omega-tests/ClientFormDialog.tsx`
- `src/components/omega-tests/ClientDetailDrawer.tsx`
- `src/components/omega-tests/ClientReminderSettings.tsx`
- `supabase/functions/process-omega-test-reminders/index.ts` + cron schedule

**Edycja:**
- `src/pages/OmegaTests.tsx` (dodanie zakładek i nagłówka „Baza testów")
- `src/hooks/useOmegaTests.ts` (filtr `clientId`)
- `src/components/dashboard/SidebarNav.tsx` (zmiana etykiety)
- `src/App.tsx` (alias routy `/baza-testow`)
- `src/components/omega-tests/OmegaTestForm.tsx` (reuse w trybie klienta — dodać prop `clientId`)

Po akceptacji przechodzę do implementacji w trybie domyślnym.
