

# Logo Pure Life Center + EQ ID + Email w konfiguracji TOTP

## Problem
Po zeskanowaniu kodu QR w aplikacji Authenticator nie wyświetla się nazwa "Pure Life Center" ani dane użytkownika (EQ ID, email). Widoczna jest domyślna nazwa projektu Supabase.

## Rozwiązanie

### Oba komponenty (`TOTPSetup.tsx` + `MFASetup.tsx`):

1. **Pobranie danych użytkownika** — na mount pobrać email z `supabase.auth.getUser()` oraz eq_id z tabeli `profiles`

2. **Budowanie własnego TOTP URI** z prawidłowym issuer i label:
   ```
   otpauth://totp/Pure Life Center:{eqId} ({email})?secret=SECRET&issuer=Pure Life Center
   ```
   Dzięki temu w aplikacji Authenticator pojawi się:
   - Nazwa usługi: **Pure Life Center**
   - Konto: **EQ123 (jan@example.com)**

3. **Generowanie QR z własnego URI** — oba komponenty będą używać `api.qrserver.com` z naszym zmodyfikowanym URI (zamiast Supabase-owego `qr_code`)

4. **Logo Pure Life na ekranie konfiguracji** — dodać `<img src={pureLifeLogo}>` nad QR kodem na naszej stronie setupu (zamiast ikony Shield)

### Ograniczenie
Logo wewnątrz samej aplikacji Authenticator (Google Auth, Authy) **nie jest możliwe** — te aplikacje same decydują o ikonach. Możemy jedynie kontrolować tekst (issuer + label).

## Pliki do zmiany
- `src/components/auth/TOTPSetup.tsx`
- `src/components/auth/MFASetup.tsx`

