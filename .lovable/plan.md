## Zakres zmian (5 punktów)

### 1. Strony potwierdzenia / anulowania — baner wydarzenia zamiast „złotego paska Pure Life"
**Pliki:** `src/pages/EventFormConfirmPage.tsx`, `src/pages/EventFormCancelPage.tsx`

- Usuwam `<DualBrandHeader />` z obu stron.
- Edge Function `confirm-event-form-email` (już dziś) zwraca `submission_id`. Rozszerzę jego odpowiedź (i `cancel-event-form-submission`) tak, by zwracała `event_id` oraz `banner_url` z `paid_events`.
- Strony pobierają i wyświetlają `banner_url` jako pełnoszerokościową grafikę nad treścią karty (fallback: brak banera = brak grafiki, bez żółtego paska).

### 2. Anulowanie nie tworzy duplikatu kontaktu w CRM
**Plik:** `supabase/functions/cancel-event-form-submission/index.ts`

Aktualnie szuka po `(user_id, email)`, ale pierwotny zapis (przy potwierdzeniu) używa tej samej pary, więc duplikat nie powinien powstawać — sprawdzę i ujednolicę:

- Dopasowanie kontaktu po `(partner_user_id, lower(email))` z dodatkowym fallbackiem po `submission_id` w `metadata`.
- Jeżeli kontakt istnieje → tylko **dopisanie notatki** „❌ Anulował(a) rejestrację na: …" oraz aktualizacja statusu kontaktu (`contact_reason` zostaje, dodaje się znacznik anulacji w notatkach). Zero `INSERT`.
- Jeżeli nie istnieje (rzadki przypadek — gość nigdy nie potwierdził) → wstawiamy nowy z odpowiednią notatką (jak teraz).
- Analogicznie poprawiam `confirm-event-form-email`, by w razie ponownego potwierdzenia nie dublował wpisu.

### 3. E-mail potwierdzający rejestrację (zalogowany użytkownik) — bez żółtego paska i logo Pure Life
**Plik:** `supabase/functions/send-event-form-confirmation/index.ts`

- Aktualnie szablon e-maila pokazuje `banner_url` formularza (jeśli ustawiony) albo nic — żółty pas nie pojawia się tutaj. Problem dotyczy szablonu „rejestracja zalogowanego użytkownika" — sprawdzę funkcję wysyłającą maile dla logged-in (najprawdopodobniej `send-notification-email` / oddzielna funkcja w `EventRegistrationsManagement`).
- Znajdę ten szablon (rg po „PURELIFE_LOGO" / „D4AF37" w `supabase/functions/`) i zastąpię nagłówek banerem `paid_events.banner_url` (full-width). Brak banera → brak nagłówka graficznego.

### 4. Kolejność w e-mailu do gościa: przycisk „Potwierdzam otrzymanie wiadomości" **nad** danymi do przelewu
**Plik:** `supabase/functions/send-event-form-confirmation/index.ts`

W funkcji `buildEmail` zmieniam kolejność bloków:
1. nagłówek + powitanie + `bodyHtml`,
2. **CTA „✅ Potwierdzam otrzymanie wiadomości"**,
3. dane do płatności (`paymentHtml`),
4. opiekun (`partnerHtml`),
5. tabela danych zgłoszeniowych,
6. link „Anuluj rejestrację".

### 5. Paid event w kalendarzu pulpitu (z flagą admina) + kategoria „EVENT"

**5a. Schemat bazy** — migracja:
```sql
ALTER TABLE paid_events
  ADD COLUMN IF NOT EXISTS show_in_dashboard_calendar boolean NOT NULL DEFAULT false;
```

**5b. Admin (przełącznik widoczności w kalendarzu)** — `src/components/admin/paid-events/editor/EventMainSettingsPanel.tsx`:
- Dodaję przełącznik „Pokaż w kalendarzu pulpitu" obok `is_published`.

**5c. Hook pobierający wydarzenia do kalendarza** — `src/hooks/useEvents.ts`:
- Dodaję drugi `select` z `paid_events` z warunkiem `show_in_dashboard_calendar=true AND is_active=true AND is_published=true AND event_date >= now() - 1 day`.
- Mapuję każdy rekord do kształtu `EventWithRegistration`:
  - `event_type: 'paid_event'` (nowy typ),
  - `start_time: event_date`, `end_time: event_end_date ?? event_date + 2h`,
  - `title`, `banner_url`, `slug`, `location`,
  - `is_registered: false` (paid event ma własną ścieżkę),
  - dodatkowe `_paid_event: true` i `_event_slug` do nawigacji.
- Łączę z istniejącą tablicą `events`.

**5d. CalendarWidget** — `src/components/dashboard/widgets/CalendarWidget.tsx`:
- W `legendItems` dopisuję `{ type: 'paid_event', color: 'bg-red-500', label: 'EVENT' }` (czerwona kropka).
- W `getEventColor`: `case 'paid_event': return 'bg-red-500'`.
- W liście wydarzeń wybranego dnia, dla `event_type === 'paid_event'`:
  - ikona `Ticket` w czerwonym akcencie,
  - tytuł + data/godzina,
  - dwa przyciski: **„Szczegóły"** i **„Zapisz się"** → oba przekierowują do `/e/${event._event_slug}` (`window.open` w nowej karcie).
  - pomijam standardowy `getRegistrationButton` dla tego typu (brak rejestracji w kalendarzu).

**5e. Filtrowanie typu** — w `filteredEvents`/`getRegistrationButton` zachowuję pełną kompatybilność (paid_event nie wpada w żadną z istniejących gałęzi `is_registered`).

## Szczegóły techniczne

- Migracja Supabase: jedna kolumna boolean + komentarz.
- Edge Functions do redeploy: `confirm-event-form-email`, `cancel-event-form-submission`, `send-event-form-confirmation`.
- Frontend pliki edytowane: `EventFormConfirmPage.tsx`, `EventFormCancelPage.tsx`, `EventMainSettingsPanel.tsx`, `useEvents.ts`, `CalendarWidget.tsx`.
- Brak zmian w typach Supabase — nowe pole będzie dostępne po regeneracji typów.
- Słownik tłumaczeń: dodam klucz `events.type.paidEvent = 'EVENT'` (PL/EN).

## Efekt dla użytkownika

1. Strony `/event-form/confirm/...` i `/event-form/cancel/...` — zamiast złotego paska widać baner wydarzenia.
2. Gość anulujący rejestrację nie tworzy drugiego wpisu w CRM — istniejący kontakt dostaje notatkę „❌ Anulował".
3. E-mail dla zalogowanego użytkownika nie zawiera złotego paska/logo Pure Life — tylko baner wydarzenia.
4. W e-mailu do gościa przycisk „Potwierdzam otrzymanie wiadomości" jest tuż pod treścią, nad danymi do przelewu.
5. Admin może w edytorze wydarzenia włączyć „Pokaż w kalendarzu pulpitu". Po włączeniu wydarzenie pojawia się w kalendarzu na pulpicie z czerwoną kropką, w legendzie dochodzi kategoria „EVENT", a po kliknięciu w dzień wyświetlają się tytuł, data, oraz przyciski „Szczegóły" i „Zapisz się" prowadzące do strony wydarzenia.