## Zmiana

W dialogu „Potwierdź usunięcie konta" (`src/pages/MyAccount.tsx`, komponent `DeleteAccountCard`) zastępujemy potwierdzenie przez wpisanie e-maila — potwierdzeniem przez **hasło do konta**. Dodatkowo użytkownik otrzymuje e-mail potwierdzający zgłoszenie usunięcia.

## 1. Dialog (frontend)

Tekst:

```
Potwierdź usunięcie konta
Ta operacja jest nieodwracalna. Twoje konto i wszystkie dane zostaną trwale usunięte.

Aby potwierdzić, wpisz poniżej hasło do konta powiązanego z adresem e-mail:
<userEmail>

[ Wpisz hasło ]   ← <Input type="password" />

Po potwierdzeniu usunięcia konta otrzymasz wiadomość e-mail z potwierdzeniem tej operacji.

[ Anuluj ]  [ Usuń konto ]
```

Zmiany w `DeleteAccountCard`:
- `confirmEmail` → `password` (string state, reset przy zamknięciu dialogu).
- Usuwamy walidację `matches` po e-mailu. Przycisk „Usuń konto" jest aktywny gdy `password.length > 0 && !submitting`.
- W `handleDelete` przed wywołaniem edge function weryfikujemy hasło:
  ```ts
  const { error: pwErr } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password,
  });
  if (pwErr) {
    toast({ title: 'Błędne hasło', description: 'Wpisane hasło jest nieprawidłowe.', variant: 'destructive' });
    setSubmitting(false);
    return;
  }
  ```
  (To ponownie ustanawia sesję dla bieżącego użytkownika — bez efektów ubocznych. Edge function dalej weryfikuje JWT.)
- Po pomyślnym wywołaniu `self-delete-account` zostaje istniejąca logika `signOut` + `window.location.replace('/konto-usuniete')`.

Pole hasła używa `type="password"`, `autoComplete="current-password"`, `autoFocus`. `<Input>` z istniejących komponentów UI.

## 2. E-mail potwierdzający do użytkownika (backend)

W `supabase/functions/self-delete-account/index.ts` po sekcji powiadomień adminów dodać wysłanie e-maila do **użytkownika** (na `email` z profilu / `user.email`). Treść po polsku, w `brandedEmailLayout`:

```
Temat: Pure Life Center — potwierdzenie zgłoszenia usunięcia konta

Cześć <imię lub e-mail>,

Otrzymaliśmy zgłoszenie usunięcia Twojego konta w Pure Life Center.

Data zgłoszenia: <data UTC>
Trwałe usunięcie zaplanowano na: <data, za 30 dni>

Przez najbliższe 30 dni możesz cofnąć tę decyzję — skontaktuj się z administracją,
aby przywrócić konto. Po tym terminie konto i wszystkie powiązane dane
zostaną nieodwracalnie usunięte.

Jeśli to nie Ty zgłosiłeś usunięcie konta, natychmiast zmień hasło
i skontaktuj się z administracją.
```

Wysyłka przez istniejący helper `sendMail` (sekwencyjnie po e-mailach adminów). Błąd wysyłki tylko logujemy (`console.warn`) — nie blokuje sukcesu operacji.

## Pliki do zmiany

- `src/pages/MyAccount.tsx` — komponent `DeleteAccountCard`:
  - stan `password` zamiast `confirmEmail`,
  - nowy tekst opisu + dopisek o e-mailu potwierdzającym,
  - `<Input type="password" />` zamiast `type="email"`,
  - weryfikacja hasła przez `supabase.auth.signInWithPassword` przed wywołaniem edge function.
- `supabase/functions/self-delete-account/index.ts`:
  - dodać wysyłkę e-maila potwierdzającego do użytkownika po zapisaniu zgłoszenia.

Brak zmian w bazie i RLS.
