
# Soft-delete kont użytkowników z decyzją admina

Obecnie kliknięcie „Usuń trwale" w `MyAccount` od razu kasuje konto (auth + profil + role, CASCADE). Admin nie jest o tym informowany i nie ma żadnej listy. Zmieniamy to na soft-delete z 30-dniowym oknem, powiadomieniem admina i sekcją w panelu.

## Co się zmienia dla użytkownika

- Po potwierdzeniu „Usuń trwale" konto **nie jest** od razu kasowane. Zostaje:
  - oznaczone jako `pending_deletion` (data zgłoszenia + planowana data trwałego usunięcia = +30 dni),
  - natychmiast zablokowane (nie można się zalogować, sesja wylogowana),
  - użytkownik trafia na `/konto-usuniete` z komunikatem: „Twoje konto zostało zgłoszone do usunięcia. Dane zostaną trwale usunięte za 30 dni. W tym czasie administrator może je przywrócić — skontaktuj się z administratorem."
- Jeśli w ciągu 30 dni admin przywróci konto, użytkownik może się znów zalogować (otrzyma e-mail informacyjny).

## Co dostaje admin

1. **E-mail do wszystkich adminów** — natychmiast po zgłoszeniu („Użytkownik X (rola, e-mail) zgłosił usunięcie konta. Trwałe usunięcie: <data>").
2. **Powiadomienie w dzwoneczku** (in-app) dla roli `admin` z linkiem do nowej sekcji.
3. **Nowa podstrona w Panelu admina → Użytkownicy → „Usunięte konta"** z dwiema zakładkami:
   - **Oczekujące usunięcia** (pending): lista, dla każdego: dane, rola, data zgłoszenia, ile dni zostało, przyciski **Przywróć konto**, **Zanonimizuj teraz**, **Usuń trwale teraz**.
   - **Historia** (już usunięte/zanonimizowane): wpisy audytowe, kto i kiedy wykonał akcję końcową.

## Auto-czyszczenie

CRON codziennie o 03:00 wywołuje edge function, która dla każdego konta z `deletion_scheduled_at <= now()` wykonuje twarde usunięcie (tak jak dzisiejszy `admin-delete-user`: anonimizacja referencji + `auth.admin.deleteUser`). Wpis trafia do historii.

## Zmiany techniczne (sekcja dla developera)

### Baza (migration)
- Nowe kolumny w `profiles`:
  - `deletion_requested_at timestamptz`
  - `deletion_scheduled_at timestamptz`
  - `deletion_status text` (`null` | `pending` | `anonymized` | `deleted`)
  - `is_active` ustawiane na `false` przy zgłoszeniu (login zablokowany przez istniejące guardy).
- Nowa tabela `account_deletion_log` (audyt finalnych akcji): `user_id`, `email_snapshot`, `full_name_snapshot`, `roles_snapshot jsonb`, `requested_at`, `final_action` (`restored|anonymized|deleted|auto_deleted`), `acted_by uuid null`, `acted_at`, `notes`. GRANT + RLS: tylko admin SELECT, service_role ALL.

### Edge functions
- **`self-delete-account`** — przerabiamy: zamiast `auth.admin.deleteUser` ustawia `deletion_*` na profilu, `is_active=false`, wstawia wiersz pending do `account_deletion_log`, wysyła powiadomienia (mail + in-app), wywołuje `signOut`. Anonimizacja FK **nie odbywa się tutaj** — dopiero przy finalnej akcji admina/CRON.
- **`admin-finalize-account-deletion`** (nowa) — body: `{ userId, action: 'restore'|'anonymize'|'delete' }`. Wymaga JWT admina. `restore` → czyści pola `deletion_*`, ustawia `is_active=true`, mail do użytkownika. `anonymize` → zostawia konto, czyści PII (imię/nazwisko/telefon/avatar → puste, e-mail → `deleted-<uuid>@anonymized.local`), `deletion_status='anonymized'`. `delete` → wykonuje pełną anonimizację FK (jak dziś) + `auth.admin.deleteUser`. Każda akcja loguje do `account_deletion_log` i `admin_activity_log`.
- **`cron-purge-pending-deletions`** (nowa) — codzienny CRON, dla `deletion_scheduled_at <= now()` woła wewnętrznie logikę `delete`.
- **`send-approval-email`/templates** — dodajemy 3 nowe app email templates: `account-deletion-requested-admin`, `account-deletion-restored-user`, `account-deletion-finalized-admin`.

### Frontend
- **`MyAccount.tsx`** — dialog potwierdzający informuje teraz o 30-dniowym oknie zamiast „nieodwracalne".
- **`AccountDeleted.tsx`** — drobna zmiana copy: „Konto zostało zgłoszone do usunięcia. Pełne dane zostaną usunięte za 30 dni. Skontaktuj się z administratorem, jeśli chcesz cofnąć decyzję."
- **`AuthContext`** — przy logowaniu: jeśli `profiles.deletion_status='pending'` → `signOut` + redirect na `/konto-usuniete` (blokada logowania w oknie 30 dni).
- **Panel admina → Użytkownicy** — nowa pozycja menu „Usunięte konta" (`/admin/usuniete-konta`) z komponentem listy (pending + history), akcjami i potwierdzeniami. Dzwoneczek (`useNotifications`) – nowy typ `account_deletion_requested`.

### Konfiguracja
- Włączyć `pg_cron` + `pg_net` (jeśli nie są) i zarejestrować dzienny job o 03:00 dla `cron-purge-pending-deletions` (przez tool insert, nie migration).
- Memory `account/self-deletion.md` zostanie zaktualizowane po implementacji.

## Co zostaje bez zmian
- Admin nadal usuwa innych przez istniejący `admin-delete-user` (twardo, bez 30-dniowego okna) — to są decyzje administracyjne.
- Ścieżki publiczne, layout `AccountDeleted`, dzisiejsze guardy `PUBLIC_PATHS`.
