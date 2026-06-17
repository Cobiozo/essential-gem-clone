## Diagnoza

Rozróżniam dwie ścieżki rejestracji na wydarzenie **bezpłatne**:

| Typ zapisującego się | Oczekiwana ścieżka |
|---|---|
| **Gość** (niezarejestrowany / `role = 'guest'`) | Auto‑potwierdzenie po kliknięciu maila → zielony „Bezpłatne — potwierdzone", bilet wysyłany od razu, bez akcji admina. |
| **Partner** (zalogowany, `role ≠ 'guest'`) | Po kliknięciu maila → **żółte „Oczekuje"** (płatność do potwierdzenia ręcznie). Admin klika **„Oznacz jako opłacone"** → zielone **„Opłacone"** + przycisk **„Cofnij do oczekującego"**. Wtedy dopiero leci bilet. |

Aktualnie (po poprzedniej zmianie) wszystkie zgłoszenia na `is_free` są traktowane jak „gościowe" — Sylwia (Partner) widnieje jako *Bezpłatne — potwierdzone*, bez możliwości cofnięcia, choć powinna iść normalną ścieżką płatności.

Logika rozpoznawania audiencji już istnieje w panelu admina: `getAudience(s) ∈ { 'partner', 'platform_guest', 'guest' }` (`EventFormSubmissions.tsx`, l. 305–323). Wykorzystamy ją również w warstwie backend.

## Plan zmian

### 1. Backend — `supabase/functions/confirm-event-form-email/index.ts`

W `ensureFreeOrderAndSendTicket` przed utworzeniem darmowego zamówienia sprawdzić audiencję na podstawie maila zgłaszającego:

```text
- pobierz profile.user_id po sub.email
- pobierz user_roles.role dla tego user_id
- isPartnerSubmission = profile_exists AND role != 'guest'
```

Jeśli `isPartnerSubmission === true`:
- **NIE** twórz `paid_event_orders` ze statusem `paid`,
- zamiast tego utwórz/zaktualizuj order z `status = 'awaiting_transfer'`, `total_amount = 0`, `email_confirmed_at = now()`, `ticket_code` (do późniejszego użycia, bez wysyłki),
- zlinkuj do `event_form_submissions.submitted_data.order_id`,
- `payment_status` **zostaje `pending`**, `email_status = 'confirmed'`,
- **nie** wołaj `issueFreeTicketForOrder`.

(Dla gości — ścieżka bez zmian: auto‑paid + ticket od razu.)

### 2. Backend — `supabase/functions/admin-mark-event-payment/index.ts`

Obsłuży to istniejąca logika (l. 64–111): admin klika „Oznacz jako opłacone" → order flipowany na `paid` → `issueFreeTicketForOrder` wysyła bilet. Bez zmian.

Drobny dodatek: jeśli zgłoszenie partnera nie ma jeszcze `order_id` (edge case starych rekordów), funkcja powinna utworzyć darmowy order ad‑hoc analogicznie do `ensureFreeOrderAndSendTicket`, ale od razu z `status = 'paid'`, i wysłać bilet.

### 3. Frontend — `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx`

Zmiana kryterium z `isFreeEvent` na **audiencję wiersza**:

- Komórka „Płatność" (`renderPaymentCell`):
  - `cancelled` → czerwone „Anulowane" (bez zmian).
  - `audience === 'partner'` lub event nie jest bezpłatny → standardowe `PAYMENT_LABELS` (**Opłacone / Oczekuje / Zwrot**) — tak jak było pierwotnie. Dla Sylwii: żółte „Oczekuje" do czasu zatwierdzenia, potem zielone „Opłacone".
  - `audience !== 'partner'` (gość / gość PLC) i event `is_free` → „Bezpłatne — potwierdzone" / „Bezpłatne — czeka na potwierdzenie e‑mail" (jak teraz).
- Akcje płatności:
  - „Oznacz jako opłacone" — widoczne dla `audience === 'partner'` lub event nie‑bezpłatny, gdy `payment_status !== 'paid'`.
  - „Cofnij do oczekującego" — widoczne dla tych samych przypadków, gdy `payment_status === 'paid'`.
  - Ukryte tylko dla gości na bezpłatnym evencie.
- Eksport Excel — ten sam podział: dla partnerów standardowe etykiety `PAYMENT_LABELS`, dla gości na free — „Bezpłatne — potwierdzone/oczekuje".

### 4. Czego NIE zmieniam
- RLS, schema bazy, `MyEventFormReferrals.tsx`, `issueFreeTicketForOrder`, `create-event-order`.
- Logika dla gości na bezpłatnym evencie (aktualne zachowanie pozostaje).

## Pliki

- `supabase/functions/confirm-event-form-email/index.ts` — rozróżnienie partner vs gość, brak auto‑paid dla partnera.
- `supabase/functions/admin-mark-event-payment/index.ts` — fallback tworzenia darmowego ordera dla starych partnerskich zgłoszeń bez `order_id`.
- `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx` — komórka „Płatność", przyciski akcji, eksport Excel oparte o audiencję.

## Efekt dla widoku z screena

- **Sylwia Ha** (Partner) → żółte **„Oczekuje"** + przycisk **„Oznacz jako opłacone"** (po kliknięciu: zielone „Opłacone" + „Cofnij do oczekującego" + wysyłka biletu).
- **Anna Olewińska** (Gość) → bez zmian, „Bezpłatne — czeka na potwierdzenie e‑mail" → automatycznie „Bezpłatne — potwierdzone" po kliknięciu w mail.
