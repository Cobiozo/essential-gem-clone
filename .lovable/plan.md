

# Plan: Dodanie zmiany emaila użytkownika przez admina

## Co robimy
Dodajemy pole edycji emaila w dialogu edycji użytkownika. Zmiana emaila wymaga edge function z `service_role_key`, bo email jest w `auth.users` (niedostępne z klienta).

## Zmiany

### 1. Nowa edge function `admin-update-user-email`
- Weryfikuje że wywołujący jest adminem (getClaims + sprawdzenie roli w DB)
- Aktualizuje email w `auth.users` via `supabaseAdmin.auth.admin.updateUserById()`
- Aktualizuje email w tabeli `profiles`
- Sprawdza unikalność nowego emaila

### 2. Config.toml
- Dodać `[functions.admin-update-user-email]` z `verify_jwt = false`

### 3. UserEditDialog.tsx
- Dodać stan `email` + `originalEmail`
- Dodać edytowalne pole email pod opisem dialogu
- Alert ostrzegawczy gdy email się zmienił
- W `handleSave`: jeśli email zmieniony → wywołać edge function przed innymi operacjami

## Przepływ zapisu
1. Jeśli email zmieniony → `supabase.functions.invoke('admin-update-user-email', { body: { userId, newEmail } })`
2. Zawsze → RPC `admin_update_user_data` (imię, nazwisko, eq_id)
3. Jeśli opiekun zmieniony → RPC `admin_change_user_guardian`

## Pliki

| Plik | Akcja |
|---|---|
| `supabase/functions/admin-update-user-email/index.ts` | Nowy |
| `supabase/config.toml` | Dodać sekcję |
| `src/components/admin/UserEditDialog.tsx` | Pole email + logika zapisu |

