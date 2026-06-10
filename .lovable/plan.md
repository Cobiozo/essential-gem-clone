## Problem

Po zatwierdzeniu konta przez administratora każdy użytkownik (partner, klient, gość PLC) dostaje ten sam szablon `admin_approval`, który zawiera m.in. listę przypisanych szkoleń i zachętę "czeka na Ciebie pełny panel narzędzi / materiały edukacyjne / społeczność". Gość PLC nie ma dostępu do tych modułów i nie powinien dostawać takiej treści.

## Rozwiązanie

Stworzyć **osobny szablon e-mail** dla gościa PLC i wybierać go po roli użytkownika.

### 1. Nowy szablon `admin_approval_guest` (migracja `INSERT INTO email_templates`)

- `internal_name`: `admin_approval_guest`
- `subject`: „Witamy w Pure Life Center — Twoje konto zostało zatwierdzone"
- `body_html`: krótka, czysto powitalna treść, bez wzmianek o panelu narzędzi / szkoleniach / społeczności:
  - Nagłówek: „Witamy w Pure Life Center, {{imię}}!"
  - Treść: „Z radością informujemy, że Twoje konto zostało zatwierdzone przez administratora i jest teraz w pełni aktywne."
  - Krótkie zdanie: „Możesz się już zalogować i korzystać z platformy."
  - Przycisk CTA „Zaloguj się" → `{{link_logowania}}`
  - Fallback link tekstowy.
- Zmienne: `{{imię}}`, `{{nazwisko}}`, `{{link_logowania}}` (bez `{{training_modules_list}}`).

Szablon `admin_approval` (partner/klient/specjalista) zostaje bez zmian — nadal zawiera listę szkoleń i pełną treść powitalną.

### 2. `supabase/functions/send-approval-email/index.ts`

Po pobraniu profilu doczytać rolę użytkownika z `user_roles` (preferowana, najwyższego priorytetu rola). Jeśli rola = `guest` i `approvalType === 'admin'`:
- użyć szablonu `admin_approval_guest`,
- nie doczytywać `training_assignments` (pomijamy blok `training_modules_list`).

W pozostałych przypadkach (`partner`, `client`, `specjalista`, `user`, `moderator`) zachować dotychczasowe zachowanie i szablon `admin_approval` z listą szkoleń.

`guardian_approval` i ścieżka leadera pozostają niezmienione.

### 3. Bez zmian po stronie wywołującej

`Admin.tsx`, `useLeaderApprovals`, `useGuardianApproval` nadal wołają `send-approval-email` z `approvalType: 'admin' | 'guardian' | 'leader'` — wybór szablonu po roli odbywa się wewnątrz funkcji edge.

## Pliki

- migracja SQL — `INSERT` nowego rekordu `email_templates` o `internal_name='admin_approval_guest'` (z `is_active=true`, footer NULL lub neutralny).
- `supabase/functions/send-approval-email/index.ts` — dobór szablonu po roli, pominięcie `training_modules_list` dla gościa.

## Pytanie kontrolne

Czy treść maila dla gościa PLC może wyglądać jak wyżej („Witamy w Pure Life Center, {{imię}}! Z radością informujemy, że Twoje konto zostało zatwierdzone przez administratora i jest teraz w pełni aktywne. Możesz się już zalogować." + przycisk „Zaloguj się"), czy chcesz inny tekst / inny tytuł?
