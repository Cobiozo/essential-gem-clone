

## Naprawa systemu resetowania hasla

### Zidentyfikowane problemy

#### Problem 1: Brak strony `/reset-password`
Aplikacja nie posiada strony do ustawienia nowego hasla po kliknieciu linku z emaila. Aktualnie:
- Link recovery z emaila kieruje na `/auth`
- Strona `/auth` wykrywa zalogowanego uzytkownika i przekierowuje na `/dashboard`
- Uzytkownik nigdy nie widzi formularza zmiany hasla

#### Problem 2: Admin -- brak opcji "bez emaila"
Dialog resetowania hasla admina ma tylko jeden przycisk "Resetuj haslo" ktory zawsze zmienia haslo I wysyla email. Brak opcji:
- "Ustaw haslo bez wysylania emaila"
- "Ustaw haslo tymczasowe i wyslij email"

#### Problem 3: Brakujace ostrzezenie bezpieczenstwa w szablonach email
Oba szablony (`password_reset` i `password_reset_admin`) nie zawieraja pelnego ostrzezenia:
- "Jezeli nie dokonywales zmiany hasla, zignoruj wiadomosc, nie klikaj w linki oraz poinformuj support w osobnej wiadomosci lub formularz na stronie Pure Life Center"

#### Problem 4: Flow uzytkownika niezgodny z oczekiwaniami
Uzytkownik oczekuje: email z haslem tymczasowym -> strona z polem "haslo tymczasowe" + "nowe haslo" + "powtorz nowe haslo".
Aktualnie: email z linkiem recovery Supabase -> brak strony docelowej.

---

### Plan naprawy

#### 1. Nowa strona `ResetPassword.tsx`

Utworzenie strony `/reset-password` z formularzem:
- Pole "Nowe haslo"
- Pole "Powtorz nowe haslo"
- Walidacja zgodnosci hasel i wymagan (min. 8 znakow, duza litera, cyfra)
- Po zatwierdzeniu: wywolanie `supabase.auth.updateUser({ password })` 
- Po sukcesie: przekierowanie na `/auth` z komunikatem "Haslo zmienione, zaloguj sie"

Strona obsluguje token recovery z URL hash (`type=recovery`).

#### 2. Nowa trasa w `App.tsx`

Dodanie:
```text
<Route path="/reset-password" element={<ResetPassword />} />
```
Trasa musi byc publiczna (nie chroniona auth guardem).

#### 3. Poprawka `send-password-reset` Edge Function

Zmiana `redirectTo` z obecnego:
```text
redirectTo: supabaseUrl.replace('.supabase.co', '.lovable.app') + '/auth'
```
na:
```text
redirectTo: 'https://purelife.lovable.app/reset-password'
```

#### 4. Rozbudowa dialogu admina w `Admin.tsx`

Zamiana jednego przycisku na dwa:
- **"Ustaw haslo (bez emaila)"** -- wywoluje `admin-reset-password` z parametrem `send_email: false`, zmienia haslo bez wysylania wiadomosci
- **"Ustaw i wyslij email"** -- dotychczasowe dzialanie, zmienia haslo i wysyla email z nowym haslem

Modyfikacja Edge Function `admin-reset-password` o obsluge parametru `send_email`.

#### 5. Aktualizacja szablonow email (SQL migration)

Dodanie do obu szablonow (`password_reset` i `password_reset_admin`) sekcji ostrzezenia bezpieczenstwa:

```text
UWAGA: Jezeli nie dokonywales zmiany hasla, zignoruj ta wiadomosc, 
nie klikaj w zadne linki oraz poinformuj nasz zespol wsparcia 
w osobnej wiadomosci lub przez formularz kontaktowy 
znajdujacy sie na stronie Pure Life Center.
```

---

### Szczegoly techniczne

**Nowe pliki:**
- `src/pages/ResetPassword.tsx` -- strona resetowania hasla z formularzem

**Modyfikowane pliki:**
- `src/App.tsx` -- dodanie trasy `/reset-password`
- `src/pages/Admin.tsx` -- rozbudowa dialogu resetu hasla (2 przyciski)
- `supabase/functions/send-password-reset/index.ts` -- poprawka `redirectTo`
- `supabase/functions/admin-reset-password/index.ts` -- obsluga `send_email: boolean`

**Migracja SQL:**
- UPDATE szablonow `password_reset` i `password_reset_admin` o sekcje ostrzezenia bezpieczenstwa

**Strona ResetPassword -- logika:**
1. Przy montowaniu: sprawdz `window.location.hash` na obecnosc `type=recovery`
2. Jesli token recovery obecny -- Supabase automatycznie loguje uzytkownika sesja recovery
3. Uzytkownik wpisuje nowe haslo + powtorzenie
4. Wywolanie `supabase.auth.updateUser({ password: newPassword })`
5. Po sukcesie: wylogowanie i przekierowanie na `/auth`

**Admin dialog -- nowa struktura:**

```text
+------------------------------------------+
| Resetuj haslo uzytkownika                |
| Email: user@example.com                  |
|                                          |
| [Nowe haslo: _______________]            |
|                                          |
| [Anuluj] [Bez emaila] [Wyslij email]    |
+------------------------------------------+
```
