

# Moduł Bezpieczeństwa w CMS Admin

## Zakres

Trzy funkcjonalności:
1. **Login Audit & Device Fingerprinting** — śledzenie logowań, detekcja anomalii (3 różne miasta w ciągu godziny = auto-blokada + wymuszenie zmiany hasła)
2. **MFA (TOTP)** — wykorzystanie wbudowanego Supabase MFA (TOTP/Authenticator App) z opcją wymuszenia przez admina
3. **Panel Bezpieczeństwa w CMS** — dashboard ze statystykami, alertami anomalii, listą logowań, zarządzaniem MFA

## Architektura

```text
┌─────────────────────────────────────────────────────┐
│                CMS → Bezpieczeństwo                 │
├──────────┬──────────┬──────────┬────────────────────┤
│ Dashboard│ Historia │ Anomalie │ Ustawienia MFA     │
│ (stats)  │ logowań  │ (alerty) │ (wymuszenie/status)│
└──────────┴──────────┴──────────┴────────────────────┘
       ↓              ↓              ↓
  login_audit_log   Edge Function   Supabase Auth MFA
  (nowa tabela)     track-login     (wbudowane TOTP)
```

## Baza danych

### Tabela `login_audit_log`
```sql
CREATE TABLE public.login_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ip_address text,
  user_agent text,
  city text,
  country text,
  device_hash text,        -- hash z user_agent+screen+language
  login_at timestamptz DEFAULT now(),
  is_suspicious boolean DEFAULT false,
  anomaly_type text        -- 'multi_city', 'rapid_device_change', etc.
);
```
RLS: admini SELECT all, user SELECT own.

### Tabela `security_alerts`
```sql
CREATE TABLE public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_type text NOT NULL,  -- 'multi_city_login', 'device_flood', 'forced_password_reset'
  severity text DEFAULT 'high',
  details jsonb DEFAULT '{}',
  is_resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

### Tabela `security_settings`
```sql
CREATE TABLE public.security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);
-- Defaults: max_cities_per_hour=3, mfa_required_roles=['admin','partner'], mfa_enforcement=false
```

## Edge Function: `track-login`

Wywoływana z frontendu po udanym logowaniu (`signIn` w AuthContext):
- Przyjmuje: `user_id`, `ip_address` (z req headers), `user_agent`, `device_hash`, `city/country` (IP geolocation via free API ipapi.co)
- Logika anomalii:
  1. Query ostatnie logowania z ostatniej godziny dla tego `user_id`
  2. Jeśli >= 3 różne `city` → oznacz jako suspicious, utwórz `security_alert`, wymuś wylogowanie (revoke sessions via admin API) i ustaw flagę wymuszenia zmiany hasła
- Insert do `login_audit_log`
- Jeśli anomalia → insert do `security_alerts` + powiadomienie admina (insert do `user_notifications`)

## MFA (Supabase TOTP)

Supabase Auth ma wbudowane wsparcie MFA/TOTP. Wykorzystamy natywne API:
- `supabase.auth.mfa.enroll({ factorType: 'totp' })` — generuje QR code
- `supabase.auth.mfa.challenge()` → `supabase.auth.mfa.verify()` — weryfikacja kodu
- `supabase.auth.mfa.listFactors()` — sprawdzenie statusu

**Komponent `MFASetup.tsx`** — dla użytkownika (w Moim Koncie):
- Krok 1: Enroll → pokaż QR code
- Krok 2: Verify → wpisz kod z aplikacji
- Krok 3: Potwierdzenie aktywacji

**Komponent `MFAChallenge.tsx`** — wymuszenie po logowaniu:
- Jeśli user ma aktywny TOTP factor → pokaż ekran weryfikacji kodu przed wpuszczeniem do dashboardu
- Jeśli admin wymusza MFA a user nie ma → przekieruj do setup

**Wymuszenie MFA przez admina:**
- W `security_settings`: `mfa_required_roles` (np. `['admin', 'partner']`)
- AuthContext sprawdza: jeśli rola w required_roles i brak active factor → blokuje dostęp do dashboardu, wymusza setup

## Frontend — nowe pliki

1. **`src/components/admin/SecurityModule.tsx`** — główny komponent z 4 zakładkami:
   - **Dashboard** — karty ze statystykami (logowania 24h, aktywne anomalie, % użytkowników z MFA)
   - **Historia logowań** — tabela z filtrowaniem (user, IP, miasto, data, suspicious flag)
   - **Alerty bezpieczeństwa** — lista alertów z przyciskiem "Rozwiąż"
   - **Ustawienia** — konfiguracja: max miast/h, wymuszenie MFA per rola, przyciski wymuszenia zmiany hasła

2. **`src/components/auth/MFASetup.tsx`** — enrollment flow (QR + verify)
3. **`src/components/auth/MFAChallenge.tsx`** — challenge po logowaniu
4. **`src/hooks/useLoginTracking.ts`** — hook wywoływany po logowaniu (generuje device_hash, wywołuje edge function)

## Modyfikacje istniejących plików

- **`AdminSidebar.tsx`** — dodanie pozycji "Bezpieczeństwo" (ikona Shield) w kategorii "system"
- **`Admin.tsx`** — dodanie `<TabsContent value="security"><SecurityModule /></TabsContent>`
- **`AuthContext.tsx`** — po signIn: wywołanie `useLoginTracking`, sprawdzenie MFA challenge

## Kolejność implementacji

1. Migracja SQL (3 tabele + RLS + indeksy)
2. Edge Function `track-login` (geolocation + anomaly detection)
3. `useLoginTracking` hook + integracja z AuthContext
4. `SecurityModule.tsx` (dashboard + historia + alerty + ustawienia)
5. `MFASetup.tsx` + `MFAChallenge.tsx`
6. Wpięcie MFA enforcement w AuthContext
7. Aktualizacja AdminSidebar + Admin.tsx

~15 plików (7 nowych, 3 modyfikacje, 1 edge function, 1 migracja SQL).

