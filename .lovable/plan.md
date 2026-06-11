## Problem

1. **Janek Malak** (zaproszony przez gościa PLC, który został usunięty) nie pokazuje partnera zapraszającego, bo `admin-finalize-account-deletion` i `cron-purge-pending-deletions` zerują `invited_by_user_id`, `partner_user_id`, `created_by` itd. — informacja jest bezpowrotnie tracona.
2. W zakładce **Goście PLC → Lista gości / Rejestracje gości** rekordy zaproszone przez usuniętego gościa PLC znikają z tych samych powodów (oraz przez cascade na `auth.users` przy pełnym usunięciu profilu/roli).
3. **Roma Romanowski** po zatwierdzeniu usunięcia (anonimizacja/delete) nie dostał maila — `admin-finalize-account-deletion` wysyła maila do użytkownika tylko przy `restore`. Brak też informacji w „Usunięte konta" o tym, że (i kiedy) mail został wysłany.

## Plan

### 1. Migracja DB — snapshot zapraszającego + log maila

- Dodać kolumny (idempotentnie):
  - `public.guest_event_registrations`: `inviter_deleted_at timestamptz`, `inviter_snapshot jsonb`
  - `public.event_form_submissions`: `partner_deleted_at timestamptz`, `partner_snapshot jsonb`
  - `public.paid_event_partner_links`: `partner_deleted_at timestamptz`, `partner_snapshot jsonb`
  - `public.events`: `creator_deleted_at timestamptz`, `creator_snapshot jsonb` (dla `created_by` — np. trójstronne / konsultacje rezerwowane przez partnera)
  - `public.account_deletion_log`: `user_email_sent_at timestamptz`, `user_email_status text`, `user_email_error text`
- Bez zmian w RLS (kolumny służbowe; admin ma już dostęp).

### 2. Edge: `_shared/account-deletion-stamp.ts`

Rozszerzyć helper o dodatkową funkcję `stampInviterAccountDeletion(supabaseAdmin, userId, snapshot)` która:
- Ustawia `inviter_snapshot` + `inviter_deleted_at` na wszystkich `guest_event_registrations.invited_by_user_id = userId` (BEZ zerowania FK).
- To samo dla `event_form_submissions.partner_user_id`, `paid_event_partner_links.partner_user_id`, `events.created_by`.
- Snapshot = `{ first_name, last_name, email, roles, action: 'anonymized'|'deleted'|'auto_deleted' }`.

### 3. Edge: `admin-finalize-account-deletion` + `cron-purge-pending-deletions`

- Przed jakimkolwiek nullowaniem FK wywołać `stampInviterAccountDeletion`.
- **Usunąć** linie zerujące `invited_by_user_id`, `partner_user_id`, `created_by` (oraz `guest_invite_links.created_by`, `user_reflinks.creator_user_id`) — zostawić FK żeby przy `anonymize` profil dalej istniał. Dla `delete` (hard) profil jest cascade-usuwany przez `auth.admin.deleteUser`; wtedy `ON DELETE SET NULL` automatycznie wyzeruje FK, ale **snapshot zostanie** i UI go pokaże.
- W gałęziach `anonymize` i `delete` wysłać maila do użytkownika („Konto zostało zanonimizowane / trwale usunięte") używając `sendMail` + branded layout. Po wysyłce zaktualizować świeżo wstawiony wiersz `account_deletion_log` polami `user_email_sent_at`, `user_email_status` (`sent` lub `failed`), `user_email_error`.
- Analogicznie wysyłać maila w `cron-purge-pending-deletions` („Konto zostało automatycznie usunięte po 30 dniach") i zapisać status.

### 4. Frontend

- **`EventRegistrationsManagement.tsx`** (Eventy → rejestracje gości) i **`EventRegistrationReport.tsx`**:
  - Doczytać `inviter_snapshot` + `inviter_deleted_at`. Jeśli `inviter_profile` brak / pusty, ale snapshot istnieje → renderować `Imię Nazwisko · konto usunięte` (badge szary „Konto usunięte"). Jeśli ani profil, ani snapshot → istniejący „—".
- **`GuestRegistrationsPanel.tsx`** (Goście PLC → Rejestracje gości):
  - Pobierać też `paid_event_partner_links` gdzie `partner_deleted_at IS NOT NULL` (tj. nie filtrować po `partner_user_id IN guestIds` — zamiast tego: linki, których `partner_user_id` należy do gości **lub** `partner_snapshot.roles` zawiera `guest`).
  - W nagłówku linku obok imienia gościa pokazać „Konto usunięte" (kiedy `partner_deleted_at` jest ustawione) i wyświetlić dane ze snapshotu.
- **`GuestsManagement.tsx` (Lista gości)**:
  - Doczytać profile z `deletion_status IN ('anonymized')` mające rolę `guest` → pokazać je z badge „Konto usunięte" (zachowując e-mail/imię ze snapshotu, jeżeli dane już zanonimizowane). Po hard-delete profil znika — w tym przypadku polegamy na snapshotach w „Rejestracje gości".
- **`DeletedAccountsManagement.tsx` (Historia)**:
  - Doczytać i wyświetlić `user_email_sent_at` + `user_email_status` jako linijkę „E-mail do użytkownika: wysłano 11.06.2026 09:50" lub badge „Mail: błąd" + tooltip z `user_email_error`. Pokazać też dla wierszy oczekujących, jeśli już wysłano.

### 5. Testowe sprawdzenie

Po wdrożeniu:
- Otworzyć `EventRegistrationsManagement` z rekordem Janka Malaka — sprawdzić, że pojawia się „Konto usunięte" w kolumnie „Partner zapraszający".
- Otworzyć Historia w „Usunięte konta" — przy Romie Romanowskim wyświetli się info o wysłanym mailu (po ponownej akcji administratora; dla istniejącego wpisu jednorazowo wykonać „Wyślij ponownie potwierdzenie" — opcjonalny przycisk w przyszłości, w tym planie pominięty).

## Pliki do zmiany

- nowy migration SQL (kolumny snapshotów + log maila)
- `supabase/functions/_shared/account-deletion-stamp.ts`
- `supabase/functions/admin-finalize-account-deletion/index.ts`
- `supabase/functions/cron-purge-pending-deletions/index.ts`
- `src/components/admin/EventRegistrationsManagement.tsx`
- `src/components/admin/EventRegistrationReport.tsx`
- `src/components/admin/GuestRegistrationsPanel.tsx`
- `src/components/admin/GuestsManagement.tsx`
- `src/components/admin/DeletedAccountsManagement.tsx`

## Czego NIE robię

- Nie zmieniam istniejących już wysłanych maili / wpisów (Roma Romanowski — istniejący wpis nie cofnie się automatycznie; nowe akcje będą działać poprawnie).
- Nie ruszam logiki przepływów rejestracji ani RLS.
