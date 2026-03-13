

# Rozbudowa Modułu Bezpieczeństwa: MFA multi-metoda, Dashboard zaawansowany, Raporty email

## Problem z MFA

Supabase natywnie wspiera **tylko TOTP** (Authenticator App). Metody SMS i email wymagają własnej implementacji:
- **Email OTP**: Edge Function generuje 6-cyfrowy kod, zapisuje w DB z TTL, wysyła przez istniejący SMTP
- **SMS**: Wymaga zewnętrznego providera (np. Twilio) — kosztowne. Alternatywa: email OTP jako domyślna "łatwa" metoda
- **TOTP**: Już zaimplementowane (Supabase native)

Admin w ustawieniach wybiera dozwolone metody. Użytkownik przy logowaniu dostaje challenge odpowiedni do wybranej metody.

## Zakres prac

### 1. Rozszerzenie security_settings (migracja SQL)
Nowe klucze:
- `mfa_method` → `'totp'` | `'email'` | `'both'` (admin wybiera dozwoloną metodę)
- `report_email` → adres email admina do raportów
- `report_frequency` → `'daily'` | `'weekly'` | `'monthly'`
- `report_enabled` → boolean

Nowa tabela `mfa_email_codes`:
```sql
CREATE TABLE mfa_email_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### 2. Edge Function: `send-mfa-code`
- Generuje 6-cyfrowy kod
- Zapisuje do `mfa_email_codes` (TTL 5 minut)
- Wysyła email przez istniejący SMTP (`smtp_settings`)
- Wywoływana po logowaniu gdy `mfa_method` = `'email'` lub `'both'`

### 3. Edge Function: `verify-mfa-code`
- Sprawdza kod z `mfa_email_codes`
- Waliduje TTL i jednorazowe użycie
- Zwraca sukces/błąd

### 4. Edge Function: `send-security-report`
- Generuje raport HTML z danymi z `login_audit_log` i `security_alerts`
- Statystyki: logowania (24h/7d/30d), anomalie, top miasta/IP, aktywność per rola
- Wysyła email na adres z `report_email` przez SMTP
- Wywoływana przez pg_cron wg `report_frequency`

### 5. SecuritySettings — rozbudowa UI
Nowe sekcje w ustawieniach:
- **Metoda MFA**: Radio group — Email z kodem / Aplikacja Authenticator / Obie metody
- **Raporty bezpieczeństwa**: Toggle + pole email + częstotliwość (daily/weekly/monthly) + przycisk "Wyślij raport testowy"

### 6. SecurityDashboard — rozbudowa
Dodanie do istniejących 5 kart:
- **Wykres logowań** (Recharts AreaChart) — trend 7/30 dni
- **Top 10 miast** — lista z liczbą logowań
- **Logowania per rola** — bar chart (admin/partner/specjalista/client)
- **Urządzenia** — pie chart (na podstawie device_hash)
- **% użytkowników z MFA** — karta z progressem
- **Ostatnie alerty** — mini-lista 5 najnowszych

### 7. MFAChallenge — obsługa email OTP
Rozszerzenie komponentu:
- Sprawdza `mfa_method` z security_settings
- Jeśli `email`: wywołuje `send-mfa-code`, pokazuje input na kod z emaila
- Jeśli `totp`: zachowanie jak dotychczas
- Jeśli `both`: użytkownik wybiera metodę

### 8. Integracja z AuthContext
Po signIn:
1. Sprawdź `mfa_enforcement` i `mfa_method` z security_settings
2. Jeśli rola wymaga MFA → pokaż odpowiedni challenge (email/totp)

## Pliki do utworzenia/modyfikacji

**Nowe (3 Edge Functions):**
- `supabase/functions/send-mfa-code/index.ts`
- `supabase/functions/verify-mfa-code/index.ts`  
- `supabase/functions/send-security-report/index.ts`

**Nowe/zmodyfikowane frontend (3):**
- `src/components/admin/security/SecurityDashboard.tsx` — rozbudowa z wykresami
- `src/components/admin/security/SecuritySettings.tsx` — nowe sekcje MFA method + raporty
- `src/components/auth/MFAChallenge.tsx` — obsługa email OTP

**Migracja SQL (1):**
- Tabela `mfa_email_codes` + nowe klucze w `security_settings`

**Config:**
- `supabase/config.toml` — nowe edge functions

Łącznie ~7 plików zmian/nowych.

