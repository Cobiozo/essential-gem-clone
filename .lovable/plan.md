## Co naprawiamy

Zgłoszone problemy:
1. **Błąd zapisu formularza** — „new row violates row-level security policy for table event_form_submissions" przy próbie rejestracji.
2. **Brak widoku dla partnera** — partner nie widzi listy osób, które zapisały się z jego linku partnerskiego (tylko liczniki).

## Diagnoza błędu RLS

Polityki INSERT są poprawne (`WITH CHECK true` dla wszystkich), więc sam zapis przechodzi. Problem powstaje na etapie `RETURNING id` (klauzula `.select('id').single()` w kliencie):
- PostgREST po INSERT zwraca wstawiony wiersz, filtrując go przez polityki SELECT.
- Polityki SELECT na `event_form_submissions` wymagają: bycia adminem **lub** `auth.uid() = partner_user_id`.
- Anonimowy gość (lub zalogowany użytkownik niebędący partnerem-właścicielem) nie spełnia żadnego warunku → PostgREST zgłasza błąd RLS.

## Plan napraw

### 1. SECURITY DEFINER RPC do bezpiecznego zapisu (migracja DB)

Tworzymy funkcję `public.submit_event_form(...)`, która:
- Waliduje istnienie aktywnego formularza i (opcjonalnie) ref_code.
- Wstawia rekord do `event_form_submissions` (z `partner_link_id` / `partner_user_id` rozwiązanymi po stronie serwera — odporne na manipulację).
- Wstawia rekord do `team_contacts` partnera (jeśli ref_code był podany), pomijając duplikaty po (user_id, email).
- Zwraca: `submission_id`, `confirmation_token` — niezbędne do dalszej wysyłki maila.

Dzięki SECURITY DEFINER omijamy SELECT-RLS po RETURNING i izolujemy logikę bezpieczeństwa od klienta.

### 2. Aktualizacja `EventFormPublicPage.tsx`

- Zamiast `supabase.from('event_form_submissions').insert(...).select('id').single()` → `supabase.rpc('submit_event_form', { ... })`.
- `partner_user_id`/`partner_link_id` przestają być wysyłane z klienta — RPC sam je wylicza po `_ref_code`.
- Dalsze wywołanie `send-event-form-confirmation` używa `submission_id` z odpowiedzi RPC.

### 3. Nowy komponent: lista „Kto zapisał się z mojego linku"

Plik: `src/components/paid-events/MyEventFormReferrals.tsx`
- Pobiera z `event_form_submissions` rekordy gdzie `partner_user_id = auth.uid()` (działa już dzięki istniejącej polityce SELECT „Partners view own referred submissions").
- Kolumny: data, imię/nazwisko, email, telefon (zaciemniony — np. ostatnie 3 cyfry), status maila (potwierdzony / oczekujący), status płatności (badge: oczekuje / opłacone / anulowane).
- Filtrowanie po `eventId` jeśli przekazane.

### 4. Osadzenie widoku referrali

- W `MyEventFormLinks.tsx` — pod każdą kartą formularza dorzucamy collapsible „Pokaż zapisanych (N)" rozwijający `MyEventFormReferrals` zawężony do `form_id`.
- Dzięki temu działa zarówno na `/paid-events` (wszystkie formularze partnera) jak i na `/event/:slug` (jeden formularz).

### 5. Maskowanie PII

Aby chronić dane gości (zgodnie z polityką PII):
- Telefon: pokazujemy `+48 ••• ••• 123` (ostatnie 3 cyfry).
- Email: pokazujemy `j••••@domena.pl`.
- Pełne dane ma tylko admin (osobny widok w `/admin?tab=paid-events` → istniejące „Zgłoszenia").

## Pliki

**Nowe:**
- `supabase/migrations/<timestamp>_submit_event_form_rpc.sql` — funkcja `submit_event_form` (SECURITY DEFINER, search_path = public).
- `src/components/paid-events/MyEventFormReferrals.tsx` — lista zapisanych z linku partnera (z maskowaniem PII).

**Edytowane:**
- `src/pages/EventFormPublicPage.tsx` — przejście na RPC `submit_event_form`.
- `src/components/paid-events/MyEventFormLinks.tsx` — collapsible „Pokaż zapisanych" z osadzonym `MyEventFormReferrals`.

## Odpowiedź na pytanie

**Tak, partner będzie widział kto zapisał się z jego linku** — lista pojawi się w panelu „Moje linki partnerskie" (zarówno na `/paid-events`, jak i na stronie konkretnego eventu `/event/:slug`). Dane osobowe są częściowo maskowane (PII); pełne dane widzi tylko admin.

Po Twojej akceptacji wykonuję migrację bazy + zmiany w kodzie.