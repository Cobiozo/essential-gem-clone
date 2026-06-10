## Cel

Komunikaty błędów przy rejestracji gościa (i podobnych miejscach) mają jasno mówić, co poszło nie tak — zamiast "Edge Function returned a non-2xx status code".

## Zakres

### 1. `supabase/functions/guest-redeem-invite/index.ts`
Każda ścieżka błędu zwraca już kod (`invalid_input`, `expired`, `exhausted`, `inactive`, `email_exists`, `profile_upsert_failed`, `token_consumed_or_invalid`, itd.), ale niektóre błędy z `createUser` przepuszczają surowy komunikat Supabase. Dodam:
- mapowanie `createErr.message` zawierającego "already been registered" / "User already registered" → kod `email_exists`,
- zawsze zwracam pole `error` (kod) + `message` (czytelny opis PL).

### 2. `src/pages/GuestRegister.tsx`
W `handleSubmit` zamiast pokazywać `data?.error || error?.message`, zbuduję słownik kodów → komunikaty po polsku:

```
invalid_input            → "Uzupełnij wszystkie pola (imię, e-mail, hasło min. 8 znaków)."
email_exists             → "Konto z tym adresem e-mail już istnieje. Zaloguj się lub użyj innego adresu."
expired                  → "Ten link zaproszenia wygasł."
exhausted                → "Limit użyć tego linku został wyczerpany."
inactive                 → "Ten link został wyłączony przez administratora."
not_found / invalid_token→ "Nieprawidłowy link zaproszenia."
token_consumed_or_invalid→ "Link zaproszenia został już wykorzystany lub jest nieprawidłowy."
profile_upsert_failed    → "Nie udało się utworzyć profilu gościa. Spróbuj ponownie za chwilę."
resolve_failed           → "Nie można zweryfikować linku zaproszenia. Spróbuj ponownie."
method_not_allowed       → "Nieprawidłowe żądanie."
fallback                 → "Rejestracja nieudana. Spróbuj ponownie lub skontaktuj się z administratorem."
```

Toast: `title` = krótki tytuł („Konto już istnieje", „Link wygasł", „Brak danych", itd.), `description` = pełne zdanie ze słownika.

### 3. Walidacja po stronie klienta przed wysłaniem
Pokażę konkretne komunikaty zanim wywołamy edge function:
- pusty e-mail / zły format → „Podaj prawidłowy adres e-mail."
- imię puste → „Podaj imię."
- (istniejące już) hasło < 8 znaków, brak zgody — zostawiam, ale doprecyzuję teksty.

## Poza zakresem
Inne formularze (logowanie, rejestracja partnera) nie są zmieniane w tym kroku — jeśli też chcesz, zrobię to w osobnym zadaniu.
