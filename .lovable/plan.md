## Cel
1. Gość PLC (zarejestrowane konto z rolą `guest`) nie ma być pokazywany jako zewnętrzny „Gość" w zakładce „Eventy → Formularze → Goście" i nie ma się dublować po potwierdzeniu maila / opłaceniu biletu.
2. Usunięcie gościa PLC przez administratora ma w pełni skasować konto (auth + profil + rola), ale wszystkie rejestracje z linku PLC mają zostać w bazie z odłączonym (anonimowym) powiązaniem.

## Diagnoza
- `EventFormSubmissions.tsx` ma `getAudience()`, który rozpoznaje `platform_guest` na podstawie `profiles.email` + `user_roles.role='guest'`. Jeżeli profil dla gościa PLC powstał z tym samym adresem co rejestracja na evencie, taki wiersz powinien dostać badge „Gość PLC", a nie „Gość".
- Lista łączy `event_form_submissions` z `paid_event_order_attendees` / `paid_event_orders` i deduplikuje po `submitted_data.order_id` oraz po `email`. Dla gościa PLC, który najpierw wypełnił formularz, potem opłacił bilet (drugi event), pojawiają się dwa wiersze, bo dedupe „po e-mailu" działa tylko gdy `order.email == submission.email` — przy PLC niekoniecznie tak jest (profil ma jeden e-mail, formularz drugi).
- Zakładki „Goście / Goście PLC / Partnerzy" istnieją, ale licznik „Wszyscy" nie rozróżnia PLC od zewnętrznych — domyślny widok pokazuje PLC jako „Gość".
- `paid_event_orders.user_id` ma `ON DELETE CASCADE` → usunięcie gościa PLC kasuje rejestracje. To trzeba zmienić na `SET NULL` (snapshot e-mail/imię/nazwisko jest już w wierszu zamówienia).
- `event_form_submissions.partner_user_id`, `guest_event_registrations.partner_user_id`, `reflinks.creator_user_id`, `guest_invite_links.created_by` — sprawdzić FK i ustawić `SET NULL` jeżeli wskazują na `auth.users`/`profiles`.
- `admin-delete-user` nie wykonuje obecnie żadnej anonimizacji powiązań poza `team_contacts`. Dla gościa PLC trzeba dopisać krok „nuluj `partner_user_id` / `creator_user_id` w rejestracjach i linkach zaproszeń" przed `auth.admin.deleteUser`.

## Plan zmian

### 1. UI — zakładka „Eventy → Formularze → Goście"
- W `EventFormSubmissions.tsx`:
  - Domyślny widok („Wszyscy") ma renderować badge `Gość PLC` zamiast `Gość` dla wierszy z `getAudience() === 'platform_guest'` (jest już ten warunek — sprawdzić, czy nie wpada do `external_guest` w przypadku braku profilu, doczytać `user_roles.role` także po `user_id` zamówienia, nie tylko po e-mailu profilu).
  - Domyślna zakładka „Goście" (`audience === 'guests'`) ma filtrować WYŁĄCZNIE `external_guest` — już tak działa, zostawiamy.
  - Dodać deduplikację po `auth user id`: jeżeli istnieje wiersz `submission` i wiersz `order` należące do tego samego `user_id` (PLC), traktować je jako jedną osobę i pokazać tylko jeden wiersz (priorytet: submission z dopiętym `__linkedOrderId`).
  - W liczniku „Wszyscy" rozbić informację na „Goście PLC (N) · Goście (M) · Partnerzy (K)".

### 2. Twarda separacja PLC od zewnętrznych gości
- Funkcja pomocnicza `isPlatformGuestEmail(email)` (klient): sprawdza, czy istnieje profil + rola `guest` dla danego adresu. Wynik użyć też przy budowaniu listy zakładki „Goście spotkań" oraz przy panelu „Goście PLC", żeby zawsze trzymać te dwa zbiory rozłączne.
- W zakładce „Goście PLC" pokazywać użytkownika TYLKO po zatwierdzeniu maila i pełnej aktywacji — wiersz event-formularza nie ma generować nowego „gościa".

### 3. Migracja DB — zmiana kaskad
- `paid_event_orders.user_id` → `ON DELETE SET NULL` (snapshot e-maila/imienia w wierszu).
- `event_form_submissions.partner_user_id` → `SET NULL`.
- `guest_event_registrations.partner_user_id` (i inne kolumny FK do `auth.users` w tej tabeli) → `SET NULL`.
- `reflinks.creator_user_id`, `user_reflinks.creator_user_id`, `guest_invite_links.created_by` → `SET NULL`.
- Tabele snapshotowe (np. `event_registrations`, `paid_event_order_attendees`) — sprawdzić w migracji i jeżeli mają FK do `auth.users`/`profiles` użytkownika rejestrującego, ustawić `SET NULL`.
- Pełną listę FK ustalamy SQL-em (`information_schema.referential_constraints`) i poprawiamy w jednej migracji.

### 4. Edge function `admin-delete-user`
- Przed `auth.admin.deleteUser(userId)` dodać krok „anonimizuj powiązania gościa PLC":
  - `update event_form_submissions set partner_user_id = null where partner_user_id = userId;`
  - `update paid_event_orders set user_id = null where user_id = userId;`
  - `update guest_event_registrations set partner_user_id = null where partner_user_id = userId;`
  - `update user_reflinks set creator_user_id = null where creator_user_id = userId;`
  - `update guest_invite_links set created_by = null where created_by = userId;`
- Dzięki temu nawet bez nowych kaskad usunięcie konta nie blokuje się błędem FK i historia rejestracji z linku PLC zostaje.
- Audit: do `admin_activity_log` zapisać `{action: 'guest_plc_deleted', removed_user_id, anonymized_counts}`.

### 5. Weryfikacja po wdrożeniu
- Zarejestrować nowego PLC (e-mail X), zarejestrować go na płatny event → w „Eventy → Formularze → Goście" ma być JEDEN wiersz z badge „Gość PLC" w zakładce „Wszyscy" i „Goście PLC", a zakładka „Goście" pokazuje 0 dla tego adresu.
- Usunąć PLC z poziomu „Goście PLC" → konto znika z `auth.users`, ale wiersz w „Eventy → Formularze" zostaje z odłączonym partnerem (puste pole „Partner zapraszający" + zachowane dane gościa).
- Sprawdzić licznik gości na kafelku eventu — nie spada (snapshot jest zachowany).

## Sekcja techniczna (dla developera)
- Pliki do zmiany: `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx`, `src/components/admin/GuestsManagement.tsx` (jedyne źródło prawdy o PLC), `supabase/functions/admin-delete-user/index.ts`, jedna nowa migracja FK.
- Migracja musi użyć `ALTER TABLE ... DROP CONSTRAINT ... ; ADD CONSTRAINT ... ON DELETE SET NULL;` dla każdego FK.
- Nie ruszać kaskady na `profiles` ↔ `auth.users` (zostaje CASCADE — profil ma znikać razem z kontem).
- Pamięć projektu: po wdrożeniu zaktualizować wpis `mem://features/guest-plc/notification-isolation` o sekcję „Usuwanie konta = anonimizacja powiązań, nie kaskada danych".
