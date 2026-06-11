# Naprawa: usunięte konto gościa nie trafia do „Usuniętych kont"

## Diagnoza (potwierdzona)

Na serwerze działa **stara wersja** funkcji `self-delete-account`, która **natychmiast i trwale kasuje konto** (log z 08:05: „user … deleted themselves"). Skutki:

- Konto gościa zostało od razu usunięte z `auth.users` i `profiles` — dlatego zniknęło z listy gości.
- Nie powstał wpis `deletion_status='pending'` ani rekord w `account_deletion_log` — dlatego zakładka „Oczekujące" i „Historia" są puste.
- Nowy kod soft-delete (30-dniowe okno + powiadomienie admina) istnieje w projekcie, ale nigdy nie został wdrożony — m.in. brak wpisów w `supabase/config.toml` dla `self-delete-account`, `admin-finalize-account-deletion` i `cron-purge-pending-deletions`.

## Plan naprawy

1. **`supabase/config.toml`** — dodać wpisy:
   - `self-delete-account` → `verify_jwt = true`
   - `admin-finalize-account-deletion` → `verify_jwt = true`
   - `cron-purge-pending-deletions` → `verify_jwt = false` (wywoływana przez CRON)
2. **Wymusić wdrożenie aktualnych wersji** tych trzech funkcji (deploy edge functions), aby na serwerze działał soft-delete z 30-dniowym oknem zamiast natychmiastowego kasowania.
3. **Wpis audytowy dla już usuniętego gościa** — dodać do `account_deletion_log` rekord z `user_id = 53b20e8a-…`, `final_action='deleted'` i notatką, że konto zostało skasowane przez starą wersję funkcji (konto jest nieodwracalnie usunięte — nie da się go przywrócić, ale admin zobaczy ślad w zakładce „Historia").
4. **Weryfikacja** — sprawdzić logi funkcji po wdrożeniu i potwierdzić, że nowe zgłoszenie ustawia `deletion_status='pending'`, tworzy wpis w logu i wysyła powiadomienie do adminów.

## Efekt

- Każde kolejne zgłoszenie usunięcia konta (gość, klient, partner) pojawi się u admina w „Usunięte konta → Oczekujące" z akcjami: Przywróć / Zanonimizuj / Usuń trwale.
- Admin dostanie e-mail i powiadomienie w aplikacji.
- Już usuniętego konta nie da się odzyskać, ale ślad trafi do „Historii".