

# Zabezpieczenie przed zablokowaniem konta po usunięciu authenticatora

## Problem
Użytkownik usunął wpis "Pure Life Center" z aplikacji Authy, ale w Supabase factor TOTP nadal jest oznaczony jako "verified". System wymaga kodu TOTP do logowania, ale użytkownik nie ma już do niego dostępu — jest zablokowany. Dodatkowo, próba ponownej konfiguracji kończy się błędem "A factor with the friendly name 'Pure Life Center' already exists".

## Rozwiązanie — 3 zabezpieczenia

### 1. Awaryjny fallback na email w MFAChallenge
Nawet gdy metoda MFA to `totp`, dodać przycisk **"Nie mam dostępu do Authenticatora"** który:
- Wysyła kod weryfikacyjny na email użytkownika (wykorzystując istniejący `send-mfa-code`)
- Po poprawnej weryfikacji emailem wpuszcza użytkownika
- Wyświetla ostrzeżenie i zachęca do ponownej konfiguracji TOTP

**Plik:** `src/components/auth/MFAChallenge.tsx`

### 2. Obsługa błędu "already exists" w TOTPSetup
Gdy `mfa.enroll()` zwróci błąd o istniejącym factorze:
- Pobrać listę factorów (`mfa.listFactors()`)
- Usunąć niezweryfikowane (unverified) factorów automatycznie (`mfa.unenroll()`)
- Ponowić enrollment

**Plik:** `src/components/auth/TOTPSetup.tsx`

### 3. Ostrzeżenie w panelu "Moje MFA" przed usunięciem z aplikacji
W `MyMfaSection` dodać widoczną informację:
> "Nie usuwaj wpisu Pure Life Center z aplikacji Authenticator dopóki nie zmienisz go tutaj. Usunięcie w zewnętrznej aplikacji może zablokować dostęp do konta."

**Plik:** `src/components/account/MyMfaSection.tsx`

## Pliki do zmiany
1. `src/components/auth/MFAChallenge.tsx` — fallback email dla TOTP-locked users
2. `src/components/auth/TOTPSetup.tsx` — auto-cleanup istniejących factorów
3. `src/components/account/MyMfaSection.tsx` — ostrzeżenie dla użytkownika

