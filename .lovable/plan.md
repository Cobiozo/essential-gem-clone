## Co zostanie zrobione

### 1. Admin → Eventy → Formularze → Zgłoszenia: ręczne przypisanie partnera + lepszy status emaila

W tabeli zgłoszeń (`EventFormSubmissions.tsx`):

- **Kolumna „Partner"** — zamiast tylko badge „Partner / —" pokażemy **imię, nazwisko i email partnera** (jeśli przypisany) oraz przycisk **„Przypisz partnera"** / **„Zmień"**. Po kliknięciu otwiera się dialog z wyszukiwarką (po imieniu/nazwisku/emailu) listującą partnerów z `profiles` (rola `partner`). Wybór partnera:
  - aktualizuje `event_form_submissions.partner_user_id`,
  - tworzy/aktualizuje wpis CRM partnera (`event_invite_contacts`) — żeby gość natychmiast pojawił się u partnera w „Kontakty prywatne → Z zaproszeń na Eventy",
  - loguje akcję w `admin_activity_log`.
  Można też **odpiąć** partnera (ustawia `partner_user_id = NULL`).

- **Kolumna „Email"** — rozszerzona o trzy jednoznaczne stany z ikonami i kolorami:
  - **Wysłany** (`email_status = 'sent'`, brak potwierdzenia) — szary
  - **Potwierdzony** (`email_confirmed_at` istnieje) — zielony „✔ Potwierdził"
  - **Anulowany przez gościa** (`cancelled_at` + `cancelled_by = 'guest'`) — czerwony „✖ Anulował"
  - **Anulowany przez admina** (`cancelled_by = 'admin'`) — pomarańczowy „Anulowane (admin)"
  - Dodatkowo data potwierdzenia/anulowania w tooltipie.

- **Eksport CSV** — dorzucone kolumny: „Partner imię", „Partner nazwisko", „Partner email", „Anulowany przez", „Data anulowania", „Data potwierdzenia emaila".

### 2. Backend: nowa funkcja `admin-assign-submission-partner`

Edge function (admin-only, weryfikacja roli przez `verifyAdmin`):
- Wejście: `{ submissionId, partnerUserId | null }`
- Aktualizuje `event_form_submissions.partner_user_id`
- Jeśli `partnerUserId` nie-null: upsert do `event_invite_contacts` (partner widzi gościa w prywatnych kontaktach z odpowiednim źródłem „event_form")
- Wpis do `admin_activity_log` (action_type: `event_form_partner_assigned`)

### 3. Naprawa „Zapisz się" na stronie eventu (PaidEventPage)

Aktualnie przycisk w sidebarze jest podpięty do `PurchaseDrawer` (zakup biletu PayU) i wymaga wybranego biletu. Event „TEST – KRAKÓW" **nie ma żadnych biletów** (`paid_event_tickets` puste), więc partner nie ma jak się zarejestrować.

Zmiana: jeśli dla wydarzenia istnieje aktywny **formularz rejestracyjny** (`event_registration_forms.is_active = true`):
- Przycisk „Zapisz się" przekierowuje do `/event-form/{form.slug}` (z dołączonym `?ref={własny_kod_partnera}` jeśli zalogowany partner ma kod w `partner_links`).
- Jeśli zalogowany jest partner — pokazujemy obok małą informację „Twoja rejestracja zostanie przypisana do Ciebie" + dane formularza pre-wypełnione z profilu.
- W `EventFormPublicPage` dodajemy auto-fill imię/nazwisko/email/telefon z `useAuth().user` przy załadowaniu, jeśli użytkownik zalogowany.

Jeśli wydarzenie **ma bilety** — flow zostaje obecny (PayU drawer), z dołożeniem `?ref` partnera w metadanych zamówienia (już zaimplementowane w `payu-create-order` — bez zmian).

Logika ustalania docelowej akcji przycisku:
```
if (form && tickets.length === 0) → link do /event-form/{slug}
else if (tickets.length > 0)      → PurchaseDrawer (jak teraz)
else                               → przycisk wyłączony „Rejestracja niedostępna"
```

### 4. Migracja DB (opcjonalna, drobna)

Indeks pomocniczy: `CREATE INDEX IF NOT EXISTS idx_event_form_submissions_partner ON event_form_submissions(partner_user_id);` — przyspiesza listy partnera.

Brak nowych tabel/kolumn — wszystkie potrzebne pola już istnieją (`partner_user_id`, `email_confirmed_at`, `cancelled_at`, `cancelled_by`).

## Pliki do zmiany

- `supabase/functions/admin-assign-submission-partner/index.ts` *(nowy)*
- `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx` — kolumny, dialog przypisania, eksport CSV
- `src/components/admin/paid-events/event-forms/AssignPartnerDialog.tsx` *(nowy)* — wyszukiwarka partnerów
- `src/pages/PaidEventPage.tsx` — logika przycisku „Zapisz się" przy braku biletów
- `src/components/paid-events/public/PaidEventSidebar.tsx` — wsparcie trybu „link do formularza" (nowy prop `formUrl`)
- `src/pages/EventFormPublicPage.tsx` — auto-fill danych zalogowanego użytkownika + auto-`ref` jeśli partner
- migracja: indeks na `partner_user_id`

## Co użytkownik zyska

- Admin widzi w jednej tabeli kto potwierdził, kto anulował (i kto anulował: gość czy admin), i kto jest partnerem zapraszającym.
- Admin może w kilka sekund przypisać partnera do dowolnej rejestracji — gość natychmiast pojawi się u partnera w „Kontakty prywatne → Z zaproszeń na Eventy".
- Każdy partner może wejść na stronę swojego eventu i zarejestrować się jednym kliknięciem (formularz pre-wypełniony, automatyczne `ref` = on sam).
