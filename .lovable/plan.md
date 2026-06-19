## Cel

Dostęp do Wyzwania 90-dniowego ma działać analogicznie do Auto-Webinaru: lider przypisuje dostęp członkom swojej struktury (z weryfikacją certyfikatu „Szybki Start"), a admin niezależnie może przypisać dostęp komukolwiek. W tabeli w panelu admina musi być widać pełne dane użytkownika (imię, nazwisko, EQ ID, email) oraz kto nadał dostęp (admin / nazwisko lidera).

## 1. Baza danych (migracja)

**`challenge_user_access`** — dodać kolumnę:
- `granted_by_role text` (`'admin' | 'leader' | 'self'`) — kto nadał

**Polityki RLS / RPC dla lidera** — dwie funkcje SECURITY DEFINER analogiczne do auto‑webinaru:

- `leader_get_team_challenge_access(p_user_ids uuid[])` → zwraca `user_id, has_access, has_szybki_start_cert` dla podanych ID (tylko jeśli są w strukturze wywołującego lidera).
- `leader_update_challenge_access(p_target_user_id uuid, p_grant_access boolean)`:
  - sprawdza, że wywołujący jest liderem celu (downline check, jak w autowebinarze),
  - sprawdza certyfikat „Szybki Start" (po `challenge_settings.szybki_start_module_id` w `certificates`),
  - przy `true` → `INSERT … ON CONFLICT (user_id) DO UPDATE` ustawiając `granted_by = auth.uid()`, `granted_by_role = 'leader'`,
  - przy `false` → `DELETE`.

Polityka tabeli `challenge_user_access` pozostaje: SELECT własny + admin; modyfikacje wyłącznie przez powyższe RPC i przez admina.

## 2. Panel admina — zakładka „Dostęp" (`AccessManager.tsx`)

Przebudowa na tabelę z pełnymi danymi (wzór `AutoWebinarAccessManagement`):

Kolumny:
- Imię i nazwisko
- EQ ID
- Email
- Rola (badge)
- Certyfikat „Szybki Start" (Tak/Nie)
- Nadane przez (Administrator / imię i nazwisko lidera / —)
- Data nadania
- Switch włącz/wyłącz + kosz

Wyszukiwarka po `first_name`, `last_name`, `email`, `eq_id`. Dodanie nowego dostępu (przez admina) zapisuje `granted_by = adminId`, `granted_by_role = 'admin'`. Lista pobiera profile + eq_id + role + certyfikat (po `szybki_start_module_id`) + nazwę osoby z `granted_by` (join z `profiles`).

## 3. Panel lidera — nowa zakładka „Wyzwanie 90-dniowe"

Nowy komponent `LeaderChallengeAccessView.tsx` (kopia wzorca `LeaderAutoWebinarAccessView`):
- Lista członków struktury z `useLeaderTeamMembers`.
- Pobiera dostęp + certyfikat przez `leader_get_team_challenge_access`.
- Dwie kolumny: „Bez dostępu" / „Z dostępem".
- Switch zablokowany, jeśli brak certyfikatu „Szybki Start" (tooltip + badge „Brak certyfikatu").
- Zapis przez `leader_update_challenge_access`.

Rejestracja zakładki w `src/pages/LeaderPanel.tsx` (lazy import + wpis w `tabs` + case w switchu render).

## 4. Bez zmian w widoczności PureBox

Hook `useChallengeAccess` już sprawdza obecność w `challenge_user_access` — pozostaje bez zmian. Niezależnie od źródła (admin/lider) dostęp działa tak samo.

## Weryfikacja

1. Lider widzi w nowej zakładce tylko swoją strukturę; włączenie dla kogoś bez certyfikatu jest zablokowane.
2. Po włączeniu przez lidera — admin widzi w tabeli „Nadane przez: {Imię Nazwisko lidera}".
3. Admin może niezależnie nadać/odebrać dostęp; oznaczenie „Administrator".
4. Użytkownik z dostępem widzi moduł w PureBox; bez dostępu — nie widzi.

### Szczegóły techniczne

- Certyfikat sprawdzany w tabeli `certificates` po `user_id` i `module_id = challenge_settings.szybki_start_module_id`.
- Walidacja downline w RPC: ta sama logika co `leader_update_auto_webinar_access` (rekurencyjny CTE po `eq_id` w `profiles`) — funkcja `leader_update_challenge_access` może wprost wywoływać istniejący helper sprawdzający relację lider→członek (do reużycia), albo replikować zapytanie.
- Migracja dodaje też index `challenge_user_access(granted_by)` (opcjonalnie).
