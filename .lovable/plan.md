

# Plan: 4 poprawki (email, telefon, MFA persistence)

## Problem 1: Pole "Potwierdź email" umożliwia autouzupełnianie
Przeglądarka automatycznie wypełnia pole `confirm-email` (session replay potwierdza: oba pola uzupełnione jednocześnie). Trzeba dodać `autoComplete="off"` na pole potwierdzenia i upewnić się, że pole email ma inny `autoComplete`.

## Problem 2: Brak pola "Potwierdź email" w formularzu rejestracji na wydarzenie
`EventGuestRegistration.tsx` nie ma pola potwierdzenia emaila. Trzeba dodać `confirm_email` do schematu zod i formularza z taką samą logiką (paste block, walidacja zgodności).

## Problem 3: Telefon opcjonalny przy rejestracji na webinar z zaproszenia
W `EventGuestRegistration.tsx` pole `phone` jest `z.string().optional()`. Gdy użytkownik przychodzi z linku zaproszeniowego (`invited_by` w URL), telefon ma być wymagany.

## Problem 4: MFA wymagane ponownie po odświeżeniu strony
`completeMfa()` ustawia `mfaPending=false` tylko w pamięci RAM. Po F5 `fetchProfile` odpala `get_my_mfa_config` i ponownie ustawia `mfaPending=true`. Rozwiązanie: po udanej weryfikacji MFA zapisać flagę w `sessionStorage` (klucz np. `mfa_verified_{userId}`). Przy sprawdzaniu MFA w `fetchProfile` — jeśli flaga istnieje, pominąć ustawianie `mfaPending`. Flaga znika po zamknięciu przeglądarki (nowa sesja = nowe MFA).

---

## Pliki do zmiany

### `src/pages/Auth.tsx`
- Dodać `autoComplete="off"` na pole `confirm-email`
- Dodać `autoComplete="email"` na pole `signup-email` (wyraźne rozróżnienie)

### `src/pages/EventGuestRegistration.tsx`
- Dodać pole `confirm_email` do typu i schematu zod (wymagane, musi pasować do `email`)
- Dodać pole UI z blokowaniem paste i walidacją wizualną (zielona/czerwona)
- Zmienić `phone` na wymagane gdy `invitedBy` jest obecne w URL
- Dodać odpowiednie labele do `RegistrationLabels`

### `src/utils/invitationTemplates.ts`
- Dodać nowe klucze: `confirmEmailLabel`, `emailsMismatch`, `emailsMatch`, `phoneError` (pl/en/de)

### `src/contexts/AuthContext.tsx`
- W `fetchProfile`: przed `setMfaPending(true)` sprawdzić `sessionStorage.getItem('mfa_verified_' + userId)` — jeśli istnieje, pominąć
- W `completeMfa`: dodać `sessionStorage.setItem('mfa_verified_' + user.id, '1')`
- W `signIn` (lub `signOut`): usunąć flagę `mfa_verified_*` przy wylogowaniu

