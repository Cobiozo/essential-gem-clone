---
name: account-self-deletion
description: Self-service usuwanie konta + ekran „konto usunięte" + ochrona przed pętlą history.replaceState gdy admin skasuje zalogowanego użytkownika
type: feature
---

# Samodzielne usuwanie konta

## UI
- W `src/pages/MyAccount.tsx` na końcu zakładki „Moje konto" (pod kartą „Zgody i regulaminy" oraz opcjonalną kartą Specjalisty) jest czerwona karta `DeleteAccountCard`.
- Dialog wymaga wpisania własnego e-maila (`profile.email`) zanim przycisk „Usuń trwale" się aktywuje.
- Dla `userRole.role === 'admin'` karta pokazuje komunikat: „Konto administratora może usunąć wyłącznie inny administrator". Brak przycisku.

## Edge function `self-delete-account`
- Wymaga `Authorization: Bearer`, działa wyłącznie na `auth.uid()` z JWT (użytkownik nie podaje `userId`).
- 403 jeśli użytkownik ma rolę `admin`.
- Anonimizuje (SET NULL) te same kolumny co `admin-delete-user`:
  `event_form_submissions.partner_user_id`, `paid_event_orders.user_id`,
  `guest_event_registrations.invited_by_user_id`, `user_reflinks.creator_user_id`,
  `guest_invite_links.created_by` + `team_contacts.linked_user_deleted_at`.
- Loguje do `admin_activity_log` (`action_type='self_account_deletion'`, `admin_user_id = self`).
- Na końcu `supabase.auth.admin.deleteUser(self.id)` (CASCADE usuwa `profiles` i `user_roles`).

## Po usunięciu / przy wykryciu skasowanego konta
- Front po sukcesie wywołuje `supabase.auth.signOut()` i robi `window.location.replace('/konto-usuniete')` — TWARDA nawigacja, nie `navigate({replace:true})`, żeby zresetować cały React tree.
- `AuthContext.fetchProfile`: jeśli `profiles` zwraca błąd `PGRST116` (brak wiersza) ORAZ `user_roles` jest pusty → traktujemy konto jako usunięte, `signOut()` + `window.location.replace('/konto-usuniete')`. Eliminuje błąd „Attempt to use history.replaceState() more than 100 times per 10 seconds", gdy admin usunął gościa PLC w trakcie aktywnej sesji.

## Trasa `/konto-usuniete`
- Publiczna, dodana do `PUBLIC_PATHS` i `KNOWN_APP_ROUTES` w `ProfileCompletionGuard`.
- `src/pages/AccountDeleted.tsx` jest statyczne — brak `useAuth`, brak zapytań do Supabase. Przyciski: „Wróć do strony głównej" (`/`) i „Zaloguj się ponownie" (`/auth`), obie używają `window.location.assign(...)`.

## Reguła implementacyjna
Po usunięciu konta (self/admin) NIGDY nie używaj `navigate(..., {replace:true})` w pętli guardów — zawsze `window.location.replace('/konto-usuniete')` jako pojedynczy hard redirect.
