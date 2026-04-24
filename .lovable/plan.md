## Cel

Po kliknięciu w mailu „Potwierdzam otrzymanie wiadomości" lub „Anuluj rejestrację" gość ma zobaczyć branżową stronę z jasnym komunikatem, system ma zaktualizować status zgłoszenia, powiadomić admina oraz partnera zapraszającego, oraz uwidocznić zdarzenie w CRM (Kontakty prywatne) partnera. Dodatkowo: w nagłówku maila pojawi się drugie logo „Eqology Independent Business Partner".

---

## 1. Strona potwierdzenia (`/event-form/confirm/:token`)

Plik: `src/pages/EventFormConfirmPage.tsx`

- Po sukcesie pokaż jeden, jednoznaczny komunikat:
  - Tytuł: „Twoje dane i rejestracja zostały poprawnie potwierdzone"
  - Treść: „Teraz oczekujemy na płatność na dane wskazane w wysłanym mailu. Po zaksięgowaniu wpłaty otrzymasz potwierdzenie udziału."
  - Branding: logo Pure Life + (NEW) logo Eqology IBP w nagłówku karty.
- Stan „już potwierdzone": ten sam komunikat + dopisek „(potwierdzone wcześniej)".
- Stan błędu (np. anulowane wcześniej): odpowiedni komunikat z fallbackiem.

## 2. Strona anulowania (`/event-form/cancel/:token`)

Plik: `src/pages/EventFormCancelPage.tsx`

- Ekran startowy (przed kliknięciem):
  - Tytuł „Anulować zgłoszenie?"
  - Wyraźna informacja: „Anulowanie jest dobrowolne. Zwracamy uwagę, że środki za bilet **nie zostają zwrócone**."
  - Przyciski: „Wróć" / „Tak, anuluj rejestrację" (destructive).
- Po sukcesie: „Twoja rejestracja została anulowana. Powiadomienie o anulowaniu zostało wysłane do organizatora."
- Branding: logo Pure Life + Eqology IBP.

## 3. Logo „Eqology Independent Business Partner"

- Wgrane logo skopiujemy do `src/assets/eqology-ibp-logo.png` (do użycia w komponentach React) oraz do `public/lovable-uploads/eqology-ibp-logo.png` (URL absolutny do użycia w mailach SMTP).
- Header maila (`send-event-form-confirmation/index.ts`) → dwa loga obok siebie (Pure Life po lewej, Eqology IBP po prawej, na tym samym złotym tle, responsywne).
- Strony Confirm/Cancel → komponent nagłówka z dwoma logami.

## 4. Edge Function `confirm-event-form-email`

Plik: `supabase/functions/confirm-event-form-email/index.ts`

Po udanym `rpc('confirm_event_form_email')` (gdy nie był wcześniej potwierdzony) — dodatkowo:
1. Pobierz pełne dane zgłoszenia (event title, partner_user_id, email, imię, nazwisko, telefon).
2. **Powiadom admina** — `user_notifications` dla wszystkich userów z rolą `admin`:
   - title: „Gość potwierdził e-mail rejestracji"
   - message: `{Imię Nazwisko} ({email}) potwierdził(a) rejestrację na {Event}`
   - link: `/admin?tab=paid-events&form_submission={id}`
   - source_module: `paid_events`
3. **Powiadom partnera zapraszającego** (jeśli `partner_user_id` ≠ null):
   - identyczne powiadomienie w `user_notifications` skierowane do partnera, z linkiem do `/dashboard?tab=contacts&contact={team_contact_id}`.
4. **Zaktualizuj kontakt CRM** w `team_contacts` (jeśli istnieje rekord z `user_id = partner_user_id` i `email = sub.email`):
   - dopisz do `notes` linijkę: `[YYYY-MM-DD HH:mm] ✅ Potwierdził rejestrację na: {Event}`
   - jeśli kontakt nie istnieje (rzadki przypadek przy starszych zgłoszeniach), utwórz go z `contact_source = 'event_invite'`.

## 5. Edge Function `cancel-event-form-submission`

Plik: `supabase/functions/cancel-event-form-submission/index.ts`

Po udanym `rpc('cancel_event_form_submission')` (gdy nie było już anulowane) — dodatkowo:
1. Pobierz dane zgłoszenia (event title, partner_user_id itp.).
2. **Powiadom admina** w `user_notifications` (wszyscy adminowie):
   - title: „Gość anulował rejestrację"
   - message: `{Imię Nazwisko} ({email}) anulował(a) rejestrację na {Event}`
   - link do panelu adminowego.
3. **Powiadom partnera zapraszającego** (jeśli istnieje):
   - analogiczne powiadomienie z linkiem do CRM.
4. **Zaktualizuj kontakt CRM** partnera w `team_contacts`:
   - dopisz do `notes`: `[YYYY-MM-DD HH:mm] ❌ Anulował(a) rejestrację na: {Event}`
   - (statusu kontaktu nie zmieniamy — pozostaje gość/lead, admin/partner sam zdecyduje co dalej).

## 6. UI admina — `EventFormSubmissions.tsx`

Status „Anulowane" (`status='cancelled'`) wraz z `cancelled_by='guest'` już jest pokazywany jako „Canceled by Guest" (zielono/pomarańczowo z poprzedniego loopa). Upewniamy się, że:
- przy zmianie statusu lista odświeża się z bazy (już tak działa po realtime/refetch).
- W kolumnie „E-mail status" emoji dla `email_confirmed_at IS NOT NULL` jest spójne (✅ Potwierdzony).

## 7. UI partnera — kontakty prywatne

Bez zmian w UI: wpisy z punktów 4/5 wpadają jako linijki w polu `notes` istniejącego kontaktu CRM. Partner widzi historię zdarzeń w karcie kontaktu prywatnego.

---

## Sekcja techniczna

### Pliki edytowane
- `src/pages/EventFormConfirmPage.tsx` — nowa treść komunikatu, dwa loga.
- `src/pages/EventFormCancelPage.tsx` — info o braku zwrotu, dwa loga.
- `src/components/branding/DualBrandHeader.tsx` *(nowy)* — reusowalny header (Pure Life + Eqology IBP).
- `supabase/functions/confirm-event-form-email/index.ts` — po RPC: notyfikacje + CRM upsert.
- `supabase/functions/cancel-event-form-submission/index.ts` — po RPC: notyfikacje + CRM upsert.
- `supabase/functions/send-event-form-confirmation/index.ts` — w `buildEmail` nagłówek z dwoma logo (URL z `public/lovable-uploads/eqology-ibp-logo.png`).
- `src/assets/eqology-ibp-logo.png`, `public/lovable-uploads/eqology-ibp-logo.png` — wgrane logo.

### Bez zmian w bazie
RPC `confirm_event_form_email` i `cancel_event_form_submission` już zwracają `submission_id` / sukces — całą logikę powiadomień i CRM realizujemy w edge funkcjach na service_role. Tabele `user_notifications`, `team_contacts`, `event_form_submissions` mają wszystkie potrzebne kolumny. Migracja DB nie jest potrzebna.

### Idempotencja
- Confirm: jeśli `already_confirmed === true`, pomijamy notyfikacje i wpis w CRM (już zostały utworzone wcześniej).
- Cancel: jeśli `already_cancelled === true`, pomijamy notyfikacje.
