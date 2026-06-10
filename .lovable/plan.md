## Cel

1. Każdy zalogowany użytkownik może samodzielnie skasować swoje konto z poziomu „Moje konto".
2. Po usunięciu (przez siebie lub przez admina) sesja zostaje czysto wygaszona, a użytkownik trafia na dedykowany ekran „Twoje konto zostało usunięte" z przyciskiem „Wróć do strony głównej" — bez pętli `history.replaceState` i bez ekranu ErrorBoundary.
3. Administrator nadal widzi historię (rejestracje, zamówienia, reflinki) — bez zmian w polityce anonimizacji wprowadzonej wcześniej. Sam profil i rola znikają (CASCADE), tak samo jak przy usuwaniu przez admina.

## Zakres zmian

### 1. Edge function: `self-delete-account` (nowa)
- Autoryzacja: tylko zalogowany użytkownik (z `Authorization` Bearer), działa na własnym `user.id`.
- Blokada bezpieczeństwa: jeżeli `user_roles.role = 'admin'` → 403 („administrator nie może usunąć własnego konta z tego ekranu"). Admina kasuje wyłącznie inny admin.
- Wykonuje TĘ SAMĄ anonimizację co `admin-delete-user` (parametr: własne `user.id`):
  - `team_contacts.linked_user_deleted_at = now()` dla `linked_user_id = self`,
  - `event_form_submissions.partner_user_id → null`,
  - `paid_event_orders.user_id → null`,
  - `guest_event_registrations.invited_by_user_id → null`,
  - `user_reflinks.creator_user_id → null`,
  - `guest_invite_links.created_by → null`.
- Loguje do `admin_activity_log` (typ `self_account_deletion`, actor = self) – żeby admin miał ślad.
- Na końcu `supabase.auth.admin.deleteUser(self.id)` (service role).
- Zwraca `{ success: true }`.

### 2. Sekcja w `src/pages/MyAccount.tsx`
Dodaj nową kartę na samym dole, poniżej karty „Zgody i regulaminy" oraz (jeśli widoczna) karty „Specjalizacje":

- Tytuł: „Usuń konto" (czerwony akcent — `destructive`).
- Opis ostrzegawczy w PL: konto zostanie trwale usunięte, dane osobowe wykasowane, historia rejestracji i zamówień zostanie zachowana w panelu administratora w formie zanonimizowanej. Operacja jest nieodwracalna.
- Przycisk „Usuń moje konto" → otwiera `AlertDialog` z dodatkowym potwierdzeniem (input, w który trzeba wpisać własny e-mail, aby aktywować przycisk „Usuń trwale").
- Po potwierdzeniu: wywołanie `supabase.functions.invoke('self-delete-account')`, następnie `await supabase.auth.signOut()` i `window.location.replace('/konto-usuniete')` (twarda nawigacja, żeby zresetować cały stan React/Auth — eliminuje ryzyko pętli `replaceState`).
- Karta ukryta dla roli `admin` (informacja: „Konto administratora może usunąć tylko inny administrator").

### 3. Nowa strona `/konto-usuniete` (`src/pages/AccountDeleted.tsx`)
- Trasa publiczna, dodana do `PUBLIC_PATHS` i `KNOWN_APP_ROUTES` (zgodnie z memo `architecture/routing-governance`).
- Karta: ikona ✓, tytuł „Twoje konto zostało usunięte", opis: „Sesja została zakończona. Wszystkie Twoje dane osobowe zostały trwale usunięte z systemu. Dziękujemy."
- Przycisk podstawowy: „Wróć do strony głównej" → `navigate('/')` (lub `window.location.assign('/')`).
- Drugi link tekstowy: „Zaloguj się ponownie" → `/auth`.
- Brak żadnych zapytań do Supabase, brak guardów, brak `useAuth` na tej stronie (czysto statyczna), żeby ekran zadziałał nawet jeśli sesja jest niespójna.

### 4. Obsługa „konto skasowane w trakcie aktywnej sesji" (przyczyna błędu z screena)
Źródło problemu z `Attempt to use history.replaceState() more than 100 times per 10 seconds`: gdy admin skasuje gościa PLC, jego JWT nadal jest w `localStorage`, ale `auth.users` już go nie ma. `AuthContext` próbuje pobrać profil → brak → kolejne strażniki tras robią `navigate(..., { replace: true })` w pętli.

Zmiana w `src/contexts/AuthContext.tsx`:
- W ścieżce inicjalizacji po `supabase.auth.getUser()`/`onAuthStateChange`, jeżeli mamy `session.user.id`, ale `profiles` zwraca `null` ORAZ `user_roles` jest puste (czyli profil został skasowany CASCADE), traktujemy konto jako usunięte:
  - `await supabase.auth.signOut()`,
  - `window.location.replace('/konto-usuniete')` (jednorazowa twarda nawigacja, nie React-router replace — brak pętli),
  - przerywamy dalszą inicjalizację (`return`), żeby żadne `useEffect` nie wystartowało drugiej fali redirectów.
- Dodatkowo: jeśli jakikolwiek wywołanie Supabase zwróci błąd `JWT user not found` / `User from sub claim does not exist` (HTTP 401/403 z `code = 'user_not_found'`), `AuthContext` łapie to globalnie i robi to samo (signOut + hard redirect na `/konto-usuniete`).

### 5. Routing
- W `src/App.tsx`: dodać `Route path="/konto-usuniete"` jako trasę publiczną (poza `<ProtectedRoute>`), przed `*` fallbackiem.
- Dopisać `/konto-usuniete` do listy `PUBLIC_PATHS` i `KNOWN_APP_ROUTES` (memo `architecture/routing-governance`).

### 6. Memoria
Aktualizacja `mem://features/guest-plc/notification-isolation` (lub nowy plik `mem://features/account/self-deletion`):
- self-delete tylko dla nie-adminów,
- redirect na `/konto-usuniete` po self-delete oraz przy wykryciu „zalogowany, ale konto usunięte",
- twardy `window.location.replace` zamiast `navigate(..., replace:true)` aby uniknąć pętli `history.replaceState`.

## Pliki, które powstaną / zostaną zmienione

- nowy: `supabase/functions/self-delete-account/index.ts`
- nowy: `src/pages/AccountDeleted.tsx`
- edycja: `src/pages/MyAccount.tsx` (sekcja „Usuń konto" + dialog)
- edycja: `src/contexts/AuthContext.tsx` (wykrycie usuniętego konta + hard redirect)
- edycja: `src/App.tsx` (trasa `/konto-usuniete`)
- edycja: pliku z listą publicznych tras (`PUBLIC_PATHS` / `KNOWN_APP_ROUTES`)
- aktualizacja memorii

## Weryfikacja po wdrożeniu

1. Zalogowany użytkownik (nie-admin) wchodzi w „Moje konto" → na dole widzi czerwoną kartę „Usuń konto", potwierdza e-mailem, klika „Usuń trwale" → trafia na `/konto-usuniete` z przyciskiem „Wróć do strony głównej". W panelu admina jego rejestracje pozostają (zanonimizowane), auth user i profil zniknęły.
2. Admin → karta „Usuń konto" jest ukryta / pokazuje komunikat „tylko inny administrator".
3. Symulacja błędu z screena: admin kasuje gościa PLC, gość ma otwartą kartę → przy następnym żądaniu / odświeżeniu `AuthContext` wykrywa brak profilu → jeden `signOut` + `window.location.replace('/konto-usuniete')` → użytkownik widzi czysty ekran „Twoje konto zostało usunięte" z przyciskiem „Wróć do strony głównej", brak ErrorBoundary i brak pętli `history.replaceState`.

Plan nie zmienia logiki biznesowej zachowywania rejestracji ani polityki anonimizacji — wprowadzonej w poprzedniej iteracji. Dodaje wyłącznie self-service usuwania konta i stabilny ekran końcowy.
