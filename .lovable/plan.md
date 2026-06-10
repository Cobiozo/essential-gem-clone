## Cel

Po rejestracji gościa PLC:
1. Konto MUSI być potwierdzone mailowo (kliknięcie linku aktywacyjnego).
2. Po aktywacji konto MUSI czekać na zatwierdzenie przez administratora (opiekuna).
3. Gość pojawia się w **Zarządzaniu użytkownikami** (z osobnym znacznikiem „Gość PLC") oraz w **Panel administratora → Goście → Lista gości**.
4. Admin może go edytować jak każdego innego użytkownika (rola, dane, zatwierdzenie, blokada, reset hasła itp.).

## Co jest nie tak teraz

- `guest-redeem-invite` ustawia `is_active: true`, `admin_approved: true`, `guardian_approved: true` — gość od razu „wchodzi". Powinno być odwrotnie: czeka na e-mail + decyzję admina.
- W „Zarządzaniu użytkownikami" goście są niewidoczni jako goście — `profiles.role` jest puste, więc wyświetlają się jako „Klient" bez sposobu odróżnienia.
- „Lista gości" w panelu admina pokazuje 0, bo dla istniejącego gościa nie powstał wpis w `user_roles` (RPC `consume_guest_invite` zwróciło błąd przy poprzedniej próbie, użytkownik osierocony).
- Brak ścieżki w UI: oczekuje na e-mail → oczekuje na zatwierdzenie admina → aktywny.

## Plan zmian

### 1. Edge function `guest-redeem-invite` — twarda blokada dostępu

W `upsert` na `profiles` ustawić wartości startowe blokujące logowanie:
- `is_active: false`
- `email_activated: false`
- `admin_approved: false`, `admin_approved_at: null`
- `guardian_approved: true` (opiekuna nie ma — admin pełni tę rolę)
- `profile_completed: true`, zgody = `true`

`auth.admin.createUser` zostaje z `email_confirm: false` (mail aktywacyjny dalej idzie przez `send-activation-email`).

### 2. Aktywacja konta gościa po kliknięciu w e-mail

Zmodyfikować istniejącą funkcję aktywacji (`activate-account` / handler linku aktywacyjnego — sprawdzę i użyję tej samej, której używają zwykli użytkownicy), tak by dla roli `guest`:
- ustawiała `email_activated: true`, `email_activated_at: now()`,
- **nie odblokowywała** `is_active` / `admin_approved` (te muszą zostać dla admina),
- pokazywała gościowi komunikat: „E-mail potwierdzony. Twoje konto czeka na zatwierdzenie przez administratora."

### 3. Logika logowania / dostępu

W warstwie auth (kontekst `useAuth` + `RequireAuth` / redirect), dla użytkownika z rolą `guest`:
- jeśli `email_activated = false` → ekran „Potwierdź e-mail" (z przyciskiem „Wyślij ponownie").
- jeśli `email_activated = true` AND (`admin_approved = false` OR `is_active = false`) → ekran „Konto oczekuje na zatwierdzenie przez administratora".
- dopiero gdy oba `true` → normalny dashboard gościa.

### 4. Zarządzanie użytkownikami — wyświetlanie gościa

W `src/pages/Admin.tsx`:
- Pobierać dodatkowo wpisy z `user_roles` (rola `guest`) i merge'ować do `users` jako pole `is_guest`.
- W komponencie wiersza użytkownika dodać badge **„Gość PLC"** (zamiast „Klient") gdy `is_guest === true`.
- `getRoleDisplayName` zwraca „Gość PLC" dla rola guest.
- Filtry zakładek (Oczekujący / Aktywni / Zablokowani / Wszyscy) działają bez zmian — gość niezatwierdzony trafi do „Oczekujący", po zatwierdzeniu do „Aktywni".
- W edytorze użytkownika dropdown ról rozszerzony o `guest` (z etykietą „Gość PLC"); `admin_update_user_role` musi to zaakceptować (sprawdzę i rozszerzę typ jeśli trzeba).
- Przyciski „Zatwierdź" / „Wyślij e-mail aktywacyjny" / „Zablokuj" / edycja danych — działają dla gościa identycznie.

### 5. Panel admina → Goście → Lista gości

Działa automatycznie po przywróceniu `user_roles.role = 'guest'` (już robi to `consume_guest_invite`). Dodatkowo:
- Pokazywać status: „Czeka na e-mail" / „Czeka na zatwierdzenie" / „Aktywny" / „Zablokowany".
- Skrót: „Otwórz w Zarządzaniu użytkownikami" → przeniesienie do `/admin?tab=users&edit={userId}`.

### 6. Sprzątanie istniejącego, uszkodzonego konta `byk1023@wp.pl`

Jednorazowy SQL: usunąć rekord (brak roli, `is_active=false`, nieużywany) lub dopisać rolę `guest` i ustawić `email_activated=false`, `admin_approved=false`, żeby admin mógł go zatwierdzić. **Pytanie do potwierdzenia poniżej.**

## Pliki do zmiany

```text
supabase/functions/guest-redeem-invite/index.ts   # zablokuj is_active/admin_approved
supabase/functions/<activation>/index.ts          # obsłuż gościa po aktywacji maila
src/pages/Admin.tsx                                # is_guest, badge „Gość PLC", role w dropdownie
src/components/admin/GuestsManagement.tsx          # status w „Lista gości" + link do edycji
src/contexts/AuthContext.tsx (lub odpowiednik)     # bramka: email + admin approval dla guest
src/components/auth/<PendingScreen>                # ekrany „Potwierdź e-mail" / „Czeka na admina"
```

Bez migracji schematu — wystarczą istniejące kolumny `is_active`, `email_activated`, `admin_approved` w `profiles` i rola `guest` w `user_roles`.

## Pytania zanim zacznę

1. Konto `byk1023@wp.pl` — **usunąć** (martwy rekord po starym błędzie) czy **naprawić** (dopisać rolę guest + ustawić jako „oczekujący na zatwierdzenie", żeby przejść pełny flow)?
2. Czy admin po zatwierdzeniu gościa ma móc też zmienić mu rolę na np. `client`/`partner` (jednym kliknięciem „awansuj"), czy guest pozostaje guest i koniec?
