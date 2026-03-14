

# Dodanie opcji wymuszenia MFA dla konkretnego użytkownika

## Kontekst
Istnieje już tabela `mfa_exempt_users` i sekcja UI do wykluczania użytkowników z MFA. Potrzebna jest **odwrotna** funkcjonalność — wymuszenie MFA dla konkretnej osoby, nawet jeśli jej rola nie wymaga MFA globalnie.

## Zmiany

### 1. Migracja SQL
- Utworzyć tabelę `mfa_enforced_users` (identyczna struktura jak `mfa_exempt_users`: `id`, `user_id`, `enforced_by`, `reason`, `created_at`)
- RLS: tylko admini (SELECT, INSERT, DELETE)
- Zaktualizować `get_my_mfa_config()` — po sprawdzeniu exemption, sprawdzić czy user jest na liście `mfa_enforced_users`. Jeśli tak → `required: true` niezależnie od ustawień globalnych

### 2. Nowy komponent `MfaEnforcementSection.tsx`
Kopia `MfaExemptionSection` z dostosowanymi:
- Ikona: `ShieldCheck` zamiast `ShieldOff`
- Tytuł: "Użytkownicy z wymuszonym MFA"
- Opis: "Wskaż użytkowników, którym MFA będzie wymuszone niezależnie od ustawień roli"
- Przycisk: "Wymuś MFA" zamiast "Wyklucz"
- Tabela: `mfa_enforced_users` zamiast `mfa_exempt_users`

### 3. Integracja w `SecuritySettings.tsx`
Dodać `<MfaEnforcementSection />` obok istniejącego `<MfaExemptionSection />`.

### 4. Aktualizacja typów
Dodać `mfa_enforced_users` do `types.ts`.

## Pliki
1. **Migracja SQL** — nowa tabela + update `get_my_mfa_config`
2. **`src/components/admin/security/MfaEnforcementSection.tsx`** — nowy komponent
3. **`src/components/admin/security/SecuritySettings.tsx`** — import + renderowanie
4. **`src/integrations/supabase/types.ts`** — typy tabeli

