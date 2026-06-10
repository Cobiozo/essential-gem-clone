## Problem

Po kliknięciu w linku aktywacyjnym z e-maila pojawia się toast „Konto aktywowane", ale przy próbie zalogowania Supabase zwraca błąd „Email nie został potwierdzony".

**Root cause**: `activate-email` ustawia w tabeli `profiles` flagę `email_activated = true`, a następnie robi redirect na oryginalny link Supabase, który dopiero ma ustawić `auth.users.email_confirmed_at`. Ten link bywa zużywany przez prefetch poczty (Gmail/Outlook/skanery antyspamowe) zanim użytkownik kliknie — gdy faktycznie klika, token jest już skonsumowany i `auth.users.email_confirmed_at` pozostaje `NULL`. Toast się pokazuje (bo `activate-email` zawsze przekierowuje na `/auth?activated=true`), ale Supabase nadal blokuje login.

## Fix Plan

### 1. `supabase/functions/activate-email/index.ts` — potwierdzaj e-mail po stronie serwera

Zamiast polegać na linku Supabase, oznacz konto jako potwierdzone bezpośrednio przez Admin API:

- `supabase.auth.admin.updateUserById(userId, { email_confirm: true })` — ustawia `email_confirmed_at` natychmiast i jest idempotentne (działa też przy ponownym kliknięciu).
- Nadal aktualizuj `profiles.email_activated = true` (jak teraz).
- Po sukcesie: bezwarunkowy redirect na `/auth?activated=true` — pomijamy `supabaseLink` w całości (nie jest już potrzebny, a to on powodował problem z prefetch).
- Jeśli `updateUserById` zwróci błąd „user not found" → redirect na `/auth?error=invalid_link`.

To rozwiązuje problem: niezależnie od tego ile razy link zostanie odwiedzony (przez skaner, prefetch, samego użytkownika), efekt jest ten sam — konto potwierdzone w `auth.users` + `profiles`.

### 2. `src/pages/Auth.tsx` — toast tylko gdy faktycznie potwierdzono

Drobna korekta: przy `?activated=true` pokazuj jeden toast z tytułem „Konto aktywowane" i opisem „Możesz się teraz zalogować" (a nie obecny `welcomeToPureLife`, który sugeruje że user jest już zalogowany). Klucz tłumaczenia: `auth.toast.canLoginNow`.

### 3. Baner „oczekiwanie na zatwierdzenie administratora" po zalogowaniu

`ApprovalStatusBanner` już to obsługuje (Case 3: `emailActivated && guardianApproved && !adminApproved` → niebieski baner „Oczekiwanie na zatwierdzenie Administratora") i jest renderowany przez `ProfileCompletionGuard`. Dla **gościa PLC** (`guardian_approved` jest ustawiane na `true` automatycznie w `guest-redeem-invite`), baner pokaże się od razu po zalogowaniu — działa bez zmian.

Sanity check: upewnić się, że dla roli `guest` po aktywacji emaila trafiamy do Case 3 (a nie Case 1/2). W `guest-redeem-invite` `guardian_approved=true` jest ustawiane, więc OK — zostawiamy.

### 4. E-mail powitalny po zatwierdzeniu przez administratora

`Admin.tsx` już wywołuje `supabase.functions.invoke('send-approval-email', { approvalType: 'admin' })` po zatwierdzeniu. Funkcja używa szablonu DB `admin_approval` ze zmienną `{{link_logowania}}` i przyciskiem.

Aktualizacja **treści szablonu w bazie** (migracja `UPDATE email_templates SET subject=..., body_html=... WHERE internal_name='admin_approval'`), aby pasowała do oczekiwań:

- Subject: „Witamy w Pure Life Center — Twoje konto jest aktywne"
- Body: nagłówek „Witamy w Pure Life!", treść „Co dalej? Zaloguj się do systemu i…", duży przycisk CTA „Zaloguj się" linkujący do `{{link_logowania}}`.

### 5. Sprawdzenie e-maila Supabase Auth (informacyjnie)

Domyślny szablon „Confirm signup" w Supabase nadal może być wysyłany przy `signUp` — dla gościa PLC używamy `auth.admin.createUser({ email_confirm: false })` + własny mail, więc OK. Dla zwykłej rejestracji warto zweryfikować, że nie wysyłamy dwóch maili (Supabase + nasz `send-activation-email`). Jeśli tak — wyłączyć Supabase confirm template lub nie robić u nas `generateLink type:'signup'` w ogóle (po zmianie #1 i tak nie używamy zwracanego linku).

## Files Changed

- `supabase/functions/activate-email/index.ts` — server-side `email_confirm: true`, usunąć redirect przez `supabaseLink`.
- `src/pages/Auth.tsx` — poprawiony toast po `?activated=true`.
- Migracja SQL — `UPDATE email_templates` dla `admin_approval` z nową treścią „Witamy w Pure Life / Zaloguj się".
- (opcjonalnie) `supabase/functions/send-activation-email/index.ts` — uprościć, nie generować już Supabase action_link, tylko zbudować URL `…/activate-email?user_id=<uuid>` z podpisanym tokenem (np. HMAC z `SUPABASE_JWT_SECRET`), żeby nikt nie mógł aktywować cudzego konta zgadując UUID. **Bez tokenu obecny endpoint jest podatny na nadużycie** — to drugi problem do naprawienia w tym samym podejściu.

## Bezpieczeństwo — krytyczna uwaga

Obecne `activate-email?user_id=<uuid>` pozwala dowolnej osobie potwierdzić dowolne konto znając jego UUID. Po zmianie #1 ten endpoint zacznie również ustawiać `email_confirmed_at` po stronie auth — to znaczy, że ktoś mógłby zalogować się na cudze konto bez weryfikacji właściciela skrzynki. Dlatego razem ze zmianą #1 **musimy** dodać token jednorazowy:

- W `send-activation-email` generujemy `activation_token` (random 32B), zapisujemy do `profiles.activation_token` + `activation_token_expires_at` (24h).
- Link w mailu: `…/activate-email?user_id=<uuid>&token=<token>`.
- `activate-email` weryfikuje token, czyści go po użyciu (jednorazowy, lub ważny dla wielokrotnych kliknięć przez 24h — idempotentny).

To wymaga migracji: dodać kolumny `activation_token text`, `activation_token_expires_at timestamptz` w `profiles`.

## Zakres potwierdzenia od użytkownika

Czy zaakceptować dodanie kolumn `activation_token` + walidację po stronie `activate-email` (rekomendowane, bez tego endpoint będzie luką bezpieczeństwa po zmianie #1)? Plan zakłada że tak.
