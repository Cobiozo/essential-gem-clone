---
name: account-self-deletion
description: Soft-delete konta (30-dni okno) z powiadomieniem admina, sekcją w panelu i CRON purgą
type: feature
---

# Samodzielne usuwanie konta (soft-delete z 30-dniowym oknem)

## Model
- Użytkownik klikający „Zgłoś usunięcie konta" w `MyAccount.tsx` NIE jest natychmiast kasowany. Zamiast tego edge function `self-delete-account`:
  1. ustawia na `profiles`: `deletion_status='pending'`, `deletion_requested_at=now()`, `deletion_scheduled_at=now()+30d`, `is_active=false`,
  2. wstawia wiersz `pending` do `account_deletion_log` (snapshot e-mail/imię/role),
  3. wysyła **e-mail do wszystkich adminów** (`smtp_settings`, helper `_shared/smtp.ts`) + **in-app notification** (`user_notifications.notification_type='account_deletion_requested'`),
  4. nie kasuje auth.users, nie anonimizuje FK.
- Admini nadal nie mogą self-deletować się tą drogą (403 jak wcześniej).

## Blokada logowania w oknie
- `AuthContext.fetchProfile`: jeśli `profile.deletion_status === 'pending'` → `signOut()` + `window.location.replace('/konto-usuniete')`. Profil dalej istnieje, więc istniejący guard „profile + roles missing" się nie odpala.
- `is_active=false` dodatkowo blokuje wybrane operacje (admin-delete-user już to sprawdza).

## Decyzja admina — `admin-finalize-account-deletion`
Body: `{ userId, action: 'restore' | 'anonymize' | 'delete' }`. Wymaga JWT admina, blokuje akcję na samym sobie.
- `restore` → czyści pola `deletion_*`, `is_active=true`, e-mail do użytkownika („konto przywrócone"), wpis `final_action='restored'` w `account_deletion_log`.
- `anonymize` → PII na profilu wyczyszczone (imię „Konto", nazwisko „usunięte", e-mail `deleted-<uuid>@anonymized.local`, phone/avatar null), `deletion_status='anonymized'`, `deletion_scheduled_at=null`, `is_active=false`. Auth user pozostaje.
- `delete` → anonimizuje FK referencje (te same kolumny co dawny `admin-delete-user`: `event_form_submissions.partner_user_id`, `paid_event_orders.user_id`, `guest_event_registrations.invited_by_user_id`, `user_reflinks.creator_user_id`, `guest_invite_links.created_by` + `team_contacts.linked_user_deleted_at`) i wywołuje `auth.admin.deleteUser`.

Każda akcja loguje wiersz do `account_deletion_log` (snapshot, `acted_by`, `acted_at`).

## Auto-czyszczenie — `cron-purge-pending-deletions`
Edge function odpalana CRON-em (codziennie 03:00 Europe/Warsaw, pg_cron + pg_net). Bierze wszystkie `profiles` z `deletion_status='pending' AND deletion_scheduled_at<=now()`, wykonuje pełną `delete`-procedurę, oznacza w logu `final_action='auto_deleted'`, `acted_by=null`.

## UI
- `src/pages/MyAccount.tsx` — `DeleteAccountCard` (przycisk „Zgłoś usunięcie konta") + dialog informuje o 30 dniach.
- `src/pages/AccountDeleted.tsx` — copy: „Konto zgłoszone do usunięcia. Trwałe usunięcie za 30 dni. Skontaktuj się z administratorem".
- `src/components/admin/DeletedAccountsManagement.tsx` — sekcja w panelu admina (`/admin?tab=deleted-accounts`, admin-only). Zakładki: Oczekujące / Zanonimizowane / Historia. Akcje: Przywróć, Zanonimizuj, Usuń trwale teraz (każda z confirm dialogiem).
- W `AdminSidebar` pozycja `deleted-accounts` ('Usunięte konta') widoczna tylko dla admina (jak `moderators`/`guests`).

## Schemat
- `profiles` zyskuje: `deletion_status text NULL`, `deletion_requested_at timestamptz`, `deletion_scheduled_at timestamptz`.
- `account_deletion_log` (RLS: SELECT admin only, service_role ALL): `user_id`, `email_snapshot`, `full_name_snapshot`, `roles_snapshot jsonb`, `requested_at`, `scheduled_at`, `final_action` (`restored|anonymized|deleted|auto_deleted`), `acted_by`, `acted_at`, `notes`.

## Reguły
- NIGDY nie reaktywuj kasowania w jednym kroku z `MyAccount` — soft-delete jest jedynym wejściem dla użytkownika.
- Admin nadal może hardziej kasować przez istniejący `admin-delete-user` (np. dla kont które nigdy nie zgłosiły usunięcia).
- E-mailing do adminów idzie przez `_shared/smtp.ts` na podstawie aktywnego `smtp_settings`.
- Po usunięciu konta (self/admin) NIGDY nie używaj `navigate(..., {replace:true})` w pętli guardów — zawsze `window.location.replace('/konto-usuniete')` jako pojedynczy hard redirect.
