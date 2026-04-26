## Cel

W zakładce **„Z zaproszeń na eventy"** każdy kontakt-gość ma pokazywać status swojej rejestracji na konkretne wydarzenie:

- ✅ **Potwierdzony** — gość kliknął w link potwierdzający w mailu (`email_confirmed_at IS NOT NULL`)
- ⏳ **Oczekuje potwierdzenia** — submission istnieje, ale brak `email_confirmed_at`
- ❌ **Anulowany** — gość anulował rejestrację (`status = 'cancelled'` lub `cancelled_at IS NOT NULL`)
- 💰 **Opłacony** — admin oznaczył opłatę (`payment_status = 'paid'`)
- 💳 **Brak płatności** — `payment_status = 'pending'` (pokazujemy tylko jeśli wydarzenie wymaga płatności)

Statusy dotyczą **wyłącznie** kontaktów z `contact_source LIKE 'event_invite%'`. Inne zakładki (auto-webinary BO/HC, strona partnerska, materiały ZW) — bez zmian.

## Źródło danych

Tabela `event_form_submissions`:
- `partner_user_id = auth.uid()` (RLS już zezwala partnerowi na SELECT po tym warunku — sprawdzone w `pg_policies`).
- Pola: `status`, `payment_status`, `email_confirmed_at`, `cancelled_at`, `email`, `event_id`, `created_at`.
- Tytuł i data wydarzenia: JOIN do `paid_events (id, title, event_date)`.

Matchowanie kontaktu ↔ submission odbywa się po **(`lower(contact.email)`, `partner_user_id`)** — jeden kontakt może mieć wiele submission (różne wydarzenia), więc to lista per kontakt.

## Implementacja

### 1. `src/components/team-contacts/types.ts`

Nowy typ `EventInviteSubmissionInfo` z polami: `submission_id`, `event_id`, `event_title`, `event_date`, `status`, `payment_status`, `email_confirmed_at`, `cancelled_at`, `created_at`.

### 2. `src/hooks/useTeamContacts.ts`

- Nowy fetch (`fetchEventInviteSubmissions`) wywoływany razem z `fetchContacts` / `fetchEventContactIds`:
  ```ts
  supabase
    .from('event_form_submissions')
    .select('id, event_id, status, payment_status, email_confirmed_at, cancelled_at, email, created_at, paid_events(title, event_date, requires_payment)')
    .eq('partner_user_id', user.id)
  ```
- Buduje `Map<contactId, EventInviteSubmissionInfo[]>` — match po `lower(email)` z kontaktami z `contact_source LIKE 'event_invite%'`.
- Eksport: `eventInviteSubmissions` w return obok `eventContactDetails`.

### 3. `src/components/team-contacts/TeamContactAccordion.tsx`

- Nowa propa: `eventInviteSubmissions?: Map<string, EventInviteSubmissionInfo[]>`.
- W bloku po „Event badges" (linia ~249) dodajemy nowy fragment renderowany wyłącznie dla kontaktów z `contact_source` zaczynającym się od `event_invite`:
  - Per submission: tytuł wydarzenia + data + zestaw badge'ów statusu (kolory: zielony=potwierdzony/opłacony, czerwony=anulowany, żółty=oczekuje, niebieski=brak płatności).
- Dodatkowo: jeżeli wszystkie submission gościa mają `status='cancelled'`, w nagłówku karty pokazujemy globalny badge „❌ Anulowano".

### 4. `src/components/team-contacts/TeamContactsTab.tsx`

- Pobranie `eventInviteSubmissions` z hooka i przekazanie do `TeamContactAccordion` (oraz analogicznie do `TeamContactsTable`, jeśli tam też ma być widoczne — minimalnie: tylko akordeon w pierwszej iteracji).

### 5. (Opcjonalnie) `TeamContactsTable.tsx`

Dodanie kolumny „Status zaproszenia" widocznej tylko gdy `privateSubTab === 'event-invites'`. Jeśli widok tabeli nie jest priorytetem, pominiemy w tej iteracji.

## Pliki do zmiany

- `src/components/team-contacts/types.ts` — nowy interfejs `EventInviteSubmissionInfo`
- `src/hooks/useTeamContacts.ts` — pobieranie submissions partnera + budowanie mapy
- `src/components/team-contacts/TeamContactAccordion.tsx` — nowa propa + render badge'ów statusu
- `src/components/team-contacts/TeamContactsTab.tsx` — przekazanie nowej propy do akordeonu

## Efekt

Sebastian (partner) otwiera zakładkę „Z zaproszeń na eventy" i obok karty Janeusza widzi:
- 📅 BUSINESS OPPORTUNITY MEETING – KRAKÓW (10.05.2026)
- ✅ Potwierdzony · 💳 Brak płatności

a obok kartki innego gościa, który anulował:
- ❌ Anulowano

Wszystko bazuje na danych już dostępnych dzięki istniejącej polityce RLS — nie potrzeba migracji bazy.
