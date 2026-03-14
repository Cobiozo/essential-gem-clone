
# Dodanie wyboru metody MFA przy wymuszeniu dla użytkownika

## Problem
Obecnie przy wymuszaniu MFA dla konkretnego użytkownika nie ma możliwości wyboru metody (email / TOTP / obie). Metoda jest brana z globalnych ustawień. Użytkownik powinien móc wybrać metodę per-osoba.

## Zmiany

### 1. Migracja SQL
- Dodać kolumnę `enforced_method TEXT DEFAULT NULL` do `mfa_enforced_users` (wartości: `email`, `totp`, `both`, `NULL` = globalna)
- Zaktualizować `get_my_mfa_config()` — gdy user jest na liście enforced, użyć `enforced_method` z tabeli zamiast globalnego `mfa_method` (fallback na globalne jeśli NULL)

### 2. UI w `MfaEnforcementSection.tsx`
- Dodać state `enforcedMethod` z wartościami `email` / `totp` / `both`
- Przy wynikach wyszukiwania dodać sekcję z radio buttons (3 opcje): "Kod email", "Aplikacja Authenticator", "Obie metody"
- Przekazywać wybraną metodę do insertu
- W liście wymuszonych użytkowników wyświetlać badge z aktualną metodą (np. "Email", "TOTP", "Obie")

### 3. Typy
- Zaktualizować `types.ts` o nową kolumnę

### Pliki do zmiany
1. **Migracja SQL** — `ALTER TABLE` + update `get_my_mfa_config`
2. **`MfaEnforcementSection.tsx`** — radio buttons + badge na liście
3. **`types.ts`** — kolumna `enforced_method`
