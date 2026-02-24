

## Nowa strona zmiany hasla tymczasowego

### Kontekst
Aktualnie email od admina z haslem tymczasowym kieruje na `/auth` (standardowe logowanie). Uzytkownik potrzebuje dedykowanej strony, gdzie wpisze haslo tymczasowe, ustali nowe haslo i dopiero potem zostanie przekierowany do logowania.

### Plan zmian

#### 1. Nowa strona `src/pages/ChangeTempPassword.tsx`

Formularz z polami:
- **Email** (pole tekstowe, wymagane)
- **Haslo tymczasowe** (z emaila od admina)
- **Nowe haslo** (z walidacja: min. 8 znakow, wielka litera, cyfra)
- **Powtorz nowe haslo** (sprawdzenie zgodnosci)
- Przycisk **"Ustaw nowe haslo"**

Logika dzialania:
1. Uzytkownik wpisuje email + haslo tymczasowe + nowe haslo
2. System loguje uzytkownika za pomoca `supabase.auth.signInWithPassword({ email, password: tempPassword })`
3. Jesli logowanie sie powiedzie -- wywoluje `supabase.auth.updateUser({ password: newPassword })`
4. Wylogowuje uzytkownika `supabase.auth.signOut()`
5. Przekierowuje na `/auth` z komunikatem "Haslo zmienione, zaloguj sie nowym haslem"

#### 2. Nowa trasa w `src/App.tsx`

Dodanie publicznej trasy:
```text
<Route path="/change-password" element={<ChangeTempPassword />} />
```

#### 3. Zmiana linku w Edge Function `admin-reset-password`

Linia 250 -- zamiana:
```text
const loginUrl = 'https://purelife.lovable.app/auth';
```
na:
```text
const loginUrl = 'https://purelife.lovable.app/change-password';
```

Przycisk w emailu bedzie teraz prowadzil do formularza zmiany hasla tymczasowego zamiast do standardowego logowania.

#### 4. Aktualizacja szablonu email (SQL migration)

Zmiana tekstu przycisku w szablonie `password_reset_admin`:
- Zamiast "Zaloguj sie do systemu" -> "Zmien haslo tymczasowe"
- Dodanie informacji: "Po kliknieciu przycisku wpisz haslo tymczasowe z tej wiadomosci, a nastepnie ustal nowe haslo"

### Podsumowanie flow

```text
Admin ustawia haslo tymczasowe i wysyla email
  |
  v
Uzytkownik otrzymuje email z haslem tymczasowym
  |
  v
Klika "Zmien haslo tymczasowe" -> /change-password
  |
  v
Wpisuje: email, haslo tymczasowe, nowe haslo, powtorz haslo
  |
  v
System: signIn(temp) -> updateUser(new) -> signOut()
  |
  v
Przekierowanie na /auth -> logowanie nowym haslem -> panel
```

### Pliki do zmian
- **Nowy:** `src/pages/ChangeTempPassword.tsx`
- **Edycja:** `src/App.tsx` (nowa trasa)
- **Edycja:** `supabase/functions/admin-reset-password/index.ts` (loginUrl)
- **Migracja SQL:** szablon `password_reset_admin` (tekst przycisku i instrukcja)

