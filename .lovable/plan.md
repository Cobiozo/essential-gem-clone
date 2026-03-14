

# Kompletny system awaryjny MFA — formularz support + self-reset TOTP

## Problem
Gdy użytkownik utraci dostęp do aplikacji Authenticator, obecny fallback na email pozwala jednorazowo się zalogować, ale nie resetuje TOTP — przy następnym logowaniu problem wraca. Brakuje też możliwości kontaktu z supportem.

## Rozwiązanie

### 1. Nowa Edge Function `self-reset-mfa`
- Użytkownik uwierzytelnia się kodem email (weryfikacja przez `verify-mfa-code`)
- Po poprawnej weryfikacji emailem, funkcja usuwa WSZYSTKIE TOTP factors użytkownika przez Admin API (`auth.admin.mfa.deleteFactor`)
- Loguje akcję do `user_activity_log`
- Po resecie użytkownik od razu trafia na ekran ponownej konfiguracji TOTP

### 2. Rozbudowa ekranu awaryjnego w `MFAChallenge.tsx`
Gdy użytkownik kliknie "Nie mam dostępu do Authenticatora", zamiast prostego fallbacku na email, pojawi się dedykowany ekran awaryjny z:

- **Przycisk "Wyślij kod email i resetuj Authenticator"** — wysyła kod email, po weryfikacji wywołuje `self-reset-mfa`, a następnie przekierowuje na `TOTPSetup` do ponownej konfiguracji
- **Przycisk "Zgłoś problem do Support"** — otwiera formularz kontaktowy (imię, email, opis problemu) który wysyła zgłoszenie do adminów jako Edge Function `send-support-ticket`

### 3. Nowa Edge Function `send-support-ticket`
- Przyjmuje: `subject`, `message`, `user_id`
- Wysyła email do administratorów (z tabeli `user_roles` role=admin → profiles → email)
- Używa istniejącego SMTP
- Wstawia powiadomienie do `user_notifications` dla adminów

### 4. Zmiany w przepływie
```text
MFA Challenge (TOTP)
  └─ "Nie mam dostępu do Authenticatora"
       ├─ [Resetuj Authenticator przez Email]
       │    1. Wyślij kod email (send-mfa-code)
       │    2. Użytkownik wpisuje kod
       │    3. Weryfikacja kodu (verify-mfa-code)
       │    4. Reset TOTP (self-reset-mfa)
       │    5. Przekierowanie → TOTPSetup
       │
       └─ [Zgłoś problem do Support]
            1. Formularz: opis problemu
            2. Wysyłka emaila do adminów (send-support-ticket)
            3. Potwierdzenie: "Zgłoszenie wysłane"
```

## Pliki do utworzenia/zmiany
1. **`supabase/functions/self-reset-mfa/index.ts`** — nowa Edge Function, resetuje TOTP po weryfikacji emailem
2. **`supabase/functions/send-support-ticket/index.ts`** — nowa Edge Function, wysyła zgłoszenie do adminów
3. **`src/components/auth/MFAChallenge.tsx`** — rozbudowa ekranu awaryjnego z dwoma ścieżkami
4. **`supabase/config.toml`** — rejestracja nowych funkcji

