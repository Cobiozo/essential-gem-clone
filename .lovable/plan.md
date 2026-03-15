

## Plan zmian: Skrócenie ważności kodu MFA + zaostrzenie lockout

### Zmiany

#### 1. `supabase/functions/send-mfa-code/index.ts`
- Zmienić `expires_at` z `5 * 60 * 1000` (5 min) na `1 * 60 * 1000` (1 min) — linia 212
- Zmienić `RATE_LIMIT_MAX_SENDS` z `5` na `3` (przy 1 min expiry, 3 kody / 15 min wystarczy)
- Zaktualizować tekst emaila: "Kod jest ważny przez 1 minutę" zamiast "5 minut"

#### 2. `supabase/functions/verify-mfa-code/index.ts`
- Zmienić `MAX_ATTEMPTS_PER_CODE` z `5` na `3` (dostosowanie do 3 błędów = lockout UI)
- Zmienić `RATE_LIMIT_MAX_VERIFICATIONS` z `10` na `5` (dostosowanie do auto-logout po 5)
- Zmienić `RATE_LIMIT_WINDOW_MINUTES` z `5` na `2` (krótsze okno, bo kod ważny tylko 1 min)

#### 3. `supabase/functions/self-reset-mfa/index.ts`
- Zmienić `MAX_ATTEMPTS_PER_CODE` z `5` na `3` (spójność)

#### 4. `src/components/auth/MFAChallenge.tsx`
- Zmienić `LOCKOUT_THRESHOLD` z `5` na `3` (blokada 60s po 3 błędach)
- Zmienić `AUTO_LOGOUT_THRESHOLD` z `10` na `5` (wylogowanie po 5 błędach)
- Zaktualizować tekst ostrzeżenia o liczbie prób (show warning od 2 błędów)

### Podsumowanie wartości

| Parametr | Stara wartość | Nowa wartość |
|----------|--------------|--------------|
| Ważność kodu email | 5 min | 1 min |
| UI lockout (60s blokada) | po 5 błędach | po 3 błędach |
| UI auto-logout | po 10 błędach | po 5 błędach |
| Max prób per kod (backend) | 5 | 3 |
| Rate-limit weryfikacji | 10 / 5 min | 5 / 2 min |
| Rate-limit wysyłek | 5 / 15 min | 3 / 15 min |

