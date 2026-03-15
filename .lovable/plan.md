

# Audyt systemu weryfikacji dwuskładnikowej (MFA)

## Architektura systemu — podsumowanie

System MFA składa się z:
- **AuthContext** — bramka MFA blokuje dostęp do dashboardu (`mfaPending` + `sessionStorage`)
- **MFAChallenge** — ekran weryfikacji (TOTP / Email OTP / oba)
- **TOTPSetup** — konfiguracja nowego authenticatora (QR + weryfikacja)
- **MFAEmergencyScreen** — reset email + formularz support
- **MyMfaSection** — zarządzanie MFA w "Moje konto"
- **Edge Functions**: `send-mfa-code`, `verify-mfa-code`, `self-reset-mfa`, `reset-user-mfa`
- **DB**: `get_my_mfa_config()`, `mfa_settings`, `mfa_exempt_users`, `mfa_enforced_users`, `mfa_email_codes`

---

## Wyniki audytu

### CO DZIAŁA DOBRZE

1. **Bramka MFA jest solidna** — `App.tsx` blokuje cały routing gdy `mfaPending=true`, nie da się ominąć
2. **Konfiguracja per-rola i per-user** — exemptions, enforcements, metody per-user
3. **Session persistence** — `sessionStorage` eliminuje ponowne wpisywanie kodu po odświeżeniu
4. **Wielopoziomowe odzyskiwanie** — self-reset email, support ticket, admin remote reset
5. **Awaryjne CTA zawsze widoczne** — na ekranach TOTPSetup i MFAChallenge
6. **TOTP enrollment** — automatyczne usuwanie niezweryfikowanych faktorów przed ponowną próbą
7. **MyMfaSection** — zmiana/usunięcie TOTP wymaga podania aktualnego kodu (nie da się usunąć bez weryfikacji)
8. **Blokada usunięcia gdy MFA wymagane** — `canRemoveTotp` sprawdza `isMfaRequired`

### ZNALEZIONE PROBLEMY I LUKI

#### KRYTYCZNE

**P1: Brak rate-limitingu na kodach email MFA**
- `send-mfa-code` nie ma żadnego limitu prób wysyłki — atakujący z ważnym tokenem może spamować skrzynkę
- `verify-mfa-code` nie limituje prób weryfikacji — brute-force 6-cyfrowego kodu (1M kombinacji) jest teoretycznie możliwy
- `self-reset-mfa` — ten sam problem, brak limitu prób kodu
- **Rekomendacja**: Dodać rate-limiting: max 5 wysyłek kodów / 15 min, max 5 prób weryfikacji / 5 min, lockout po przekroczeniu

**P2: Kody email nie mają limitu prób weryfikacji per kod**
- Tabela `mfa_email_codes` nie śledzi `attempt_count`
- Jeden kod można próbować odgadywać wielokrotnie dopóki nie wygaśnie (5 min = 300s)
- **Rekomendacja**: Dodać kolumnę `attempts` do `mfa_email_codes`, po 3-5 nieudanych próbach automatycznie oznaczać kod jako `used`

#### ŚREDNIE

**P3: `self-reset-mfa` — kolumna `metadata` może nie istnieć w `user_activity_log`**
- Linia 119 zapisuje do `metadata`, ale poprzednia wersja Edge Function miała problem z nazwami kolumn
- Jeśli tabela nie ma kolumny `metadata`, insert się nie powiedzie (ale jest w try/catch, więc nie blokuje)
- **Rekomendacja**: Zweryfikować schemat `user_activity_log` i ujednolicić nazwy kolumn

**P4: QR code generowany przez zewnętrzne API**
- `https://api.qrserver.com/v1/create-qr-code/` — tajne dane TOTP (secret) wysyłane do zewnętrznego serwera
- To potencjalny wyciek secretu TOTP przez URL
- **Rekomendacja**: Generować QR lokalnie (biblioteka JS np. `qrcode`) lub użyć wbudowanego `data.totp.uri` z Supabase

**P5: Brak czyszczenia starych kodów email**
- Tabela `mfa_email_codes` rośnie bez ograniczeń — wygasłe kody nie są usuwane
- **Rekomendacja**: Dodać cron/scheduled function do czyszczenia kodów starszych niż 24h

#### NISKIE

**P6: `sessionStorage` MFA verification — ograniczona trwałość**
- Zamknięcie karty = reset weryfikacji MFA (zamierzony trade-off bezpieczeństwa vs UX)
- Ale otwarcie nowej karty w tej samej sesji przeglądarki NIE dzieli `sessionStorage`
- Użytkownik musi ponownie weryfikować MFA w każdej nowej karcie
- **Rekomendacja**: Rozważyć czy to pożądane zachowanie (prawdopodobnie tak — lepsza ochrona)

**P7: Brak automatycznego wylogowania po wielokrotnych nieudanych próbach MFA**
- Użytkownik może próbować kody TOTP/email bez limitu na UI (toast z błędem, ale brak lockout)
- **Rekomendacja**: Po 10 nieudanych próbach automatycznie wylogować lub zablokować na 15 min

**P8: `MFASetup.tsx` — komponent wydaje się nieużywany**
- Jest duplikatem `TOTPSetup.tsx` ale z inną logiką — potencjalne źródło pomyłek
- **Rekomendacja**: Usunąć jeśli nieużywany, ujednolicić do jednego komponentu

---

## Plan naprawy — priorytetyzowany

### Faza 1: Rate-limiting (krytyczne)

1. **Dodać rate-limiting do `send-mfa-code`**
   - Sprawdzać liczbę kodów wysłanych w ostatnich 15 min z `mfa_email_codes`
   - Max 5 kodów / 15 min — zwracać 429 po przekroczeniu

2. **Dodać rate-limiting do `verify-mfa-code` i `self-reset-mfa`**
   - Nowa tabela `mfa_verification_attempts` lub kolumna `attempts` na `mfa_email_codes`
   - Max 5 nieudanych weryfikacji / 5 min
   - Po przekroczeniu: invalidować kod + zwracać 429

3. **Dodać lockout na UI po wielokrotnych błędach**
   - Po 5 nieudanych próbach na `MFAChallenge` — odliczanie 60s przed kolejną próbą
   - Po 10 — automatyczne wylogowanie

### Faza 2: Bezpieczeństwo secretu TOTP

4. **Zamienić zewnętrzne API QR na lokalne generowanie**
   - Użyć `data.totp.uri` z Supabase SDK (który jest zwracany przez `mfa.enroll`)
   - Generować QR przez bibliotekę kliencką (np. `qrcode` npm package)
   - Eliminuje wyciek secretu do zewnętrznego serwera

### Faza 3: Utrzymanie

5. **Cron do czyszczenia wygasłych kodów email**
   - Edge Function `cleanup-mfa-codes` uruchamiana co 24h
   - Usuwanie kodów starszych niż 24h z `mfa_email_codes`

6. **Usunięcie duplikatu `MFASetup.tsx`** jeśli nieużywany

### Szacowane zmiany plików

| Plik | Zmiana |
|------|--------|
| `supabase/functions/send-mfa-code/index.ts` | Rate-limit wysyłek |
| `supabase/functions/verify-mfa-code/index.ts` | Rate-limit weryfikacji + counter |
| `supabase/functions/self-reset-mfa/index.ts` | Rate-limit prób resetu |
| `src/components/auth/MFAChallenge.tsx` | UI lockout po wielu błędach |
| `src/components/auth/TOTPSetup.tsx` | Lokalne generowanie QR |
| Nowa migracja SQL | Kolumna `attempts` lub tabela `mfa_verification_attempts` |
| Opcjonalnie: `supabase/functions/cleanup-mfa-codes/index.ts` | Cron cleanup |

