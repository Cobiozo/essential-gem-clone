Cel: po rejestracji gość nie loguje się od razu — musi najpierw kliknąć link potwierdzający w mailu, dopiero potem konto staje się aktywne i może się zalogować.

## Zmiany

### 1. Edge Function `guest-redeem-invite`
- Tworzymy użytkownika z `email_confirm: false` (zamiast `true`) — Supabase wymusi kliknięcie linka aktywacyjnego.
- W profilu ustawiamy `email_activated: false`, `is_active: false`.
- Token zaproszenia rezerwujemy/konsumujemy dopiero po aktywacji (alternatywa: konsumujemy od razu — do potwierdzenia z użytkownikiem; rekomendacja: konsumujemy od razu, żeby ten sam link nie został wykorzystany ponownie do założenia kolejnego konta przed potwierdzeniem).
- Wysyłamy własny mail aktywacyjny przez istniejący szablon (`auth-email-hook` typ `signup`) zawierający CTA „Potwierdzam adres e-mail" linkujący do `/auth/confirm?...` (Supabase auth confirmation URL).
- Po sukcesie funkcja zwraca `{ ok: true, requires_email_confirmation: true }`.

### 2. Strona `GuestRegister.tsx`
- Po udanej rejestracji NIE wywołujemy `signInWithPassword`.
- Zamiast tego pokazujemy ekran „Sprawdź skrzynkę pocztową" z instrukcją:
  - „Wysłaliśmy link aktywacyjny na adres {email}."
  - „Sprawdź skrzynkę odbiorczą oraz folder SPAM/Oferty."
  - „Kliknij przycisk »Potwierdzam adres e-mail« w wiadomości."
  - „Po potwierdzeniu zaloguj się tutaj." → przycisk do `/auth`.

### 3. Szablon maila (`_shared/email-templates/signup.tsx`)
- Sprawdzimy/dopasujemy treść dla gościa: nagłówek, CTA „Potwierdzam adres e-mail", krótki opis platformy. Branding zgodny z resztą maili PureLife.

### 4. Aktywacja po kliknięciu w mailu
- Supabase domyślnie kieruje na `Site URL` z tokenem — nasza aplikacja już obsługuje `detectSessionInUrl: true` w `client.ts`, więc po kliknięciu link otworzy aplikację i utworzy sesję.
- Dodajemy trigger/funkcję `on_auth_user_confirmed`: po `email_confirmed_at IS NOT NULL` ustawiamy w `profiles`: `email_activated = true`, `email_activated_at = now()`, `is_active = true`.
  - Alternatywa: zrobić to po stronie klienta przy pierwszym logowaniu — mniej pewne, więc wybieramy trigger DB.
- Po przekierowaniu do aplikacji `AuthContext` wykryje sesję i `ProfileCompletionGuard` przepuści gościa (już ma `profile_completed=true`, `guardian/admin_approved=true`).

### 5. Logowanie
- Standardowe `/auth` z email + hasło — Supabase odrzuci logowanie dopóki email nie jest potwierdzony (komunikat „Email not confirmed"). Dodamy tłumaczenie tego błędu w `Auth.tsx`: „Potwierdź adres e-mail klikając link wysłany na Twoją skrzynkę."

## Szczegóły techniczne

- Migracja SQL: trigger `AFTER UPDATE OF email_confirmed_at ON auth.users` — w Supabase nie można dotykać schematu `auth`, więc zamiast triggera użyjemy webhooka `auth-email-hook` LUB synchronizacji w momencie pierwszego logowania (RPC `mark_guest_email_activated` wywołane z klienta po udanym `signInWithPassword`). Wybieram wariant RPC — bezpieczny, bez ingerencji w `auth`.
- `guest-redeem-invite`: usuwamy `email_confirm: true`, ustawiamy `is_active=false`, `email_activated=false`.
- Token gościa: konsumujemy od razu (zapobiega dublowaniu kont z jednego linka).

Efekt: rejestracja → ekran „sprawdź email" → klik w mailu → sesja w aplikacji → trigger/RPC aktywuje konto → gość może też logować się hasłem.
