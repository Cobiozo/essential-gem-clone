

# Analiza i plan zmian MFA

## 1. Google Authenticator (TOTP) — NIE ZADZIAŁA

Obecny kod `MFAChallenge` wywołuje `supabase.auth.mfa.listFactors()` i szuka zweryfikowanego faktora TOTP. Problem: **w aplikacji nie istnieje UI do rejestracji faktora TOTP** (skanowanie kodu QR, podanie pierwszego kodu weryfikacyjnego). Gdyby admin przełączył na TOTP teraz, użytkownicy zobaczą ekran MFA z wyłączonym przyciskiem "Weryfikuj" (bo `factorId === null`). Trzeba dodać ekran enrollmentu TOTP.

## 2. Wykluczenia z MFA — brak w systemie

Aktualnie MFA dotyczy ról (client, partner, specjalista). Nie ma mechanizmu wykluczenia konkretnych użytkowników. Potrzebna nowa tabela `mfa_exempt_users` + aktualizacja RPC `get_my_mfa_config` + sekcja w UI admina.

## 3. Analiza dostarczalności email

SMTP wysyła z `support@purelife.info.pl` przez serwer `s108.cyber-folks.pl`. Adresy narażone na problemy:

| Domena | Liczba użytk. | Ryzyko |
|--------|--------------|--------|
| `gmail.copm` (1) | Literówka — nigdy nie dotrze |
| `gmail.com1` (1) | Literówka — nigdy nie dotrze |
| `protonmail.com` (2), `proton.me` (1) | Agresywne filtry antyspamowe — mogą odrzucać bez SPF/DKIM |
| `hotmail.com` (4), `yahoo.co.uk` (1) | Microsoft/Yahoo wymagają poprawnych SPF/DKIM — mogą trafiać do spamu |
| `icloud.com` (1) | Apple ma surowe filtry |
| Domeny niestandardowe: `amorki.pl`, `buziaczek.pl`, `vp.pl`, `makaku.pl` | Małe serwery — nieprzewidywalne, mogą odrzucać |

Brak nagłówków `Message-ID` i `Date` w kodzie SMTP zwiększa prawdopodobieństwo klasyfikacji jako spam.

---

## Plan implementacji

### A. Tabela `mfa_exempt_users` (migracja)
- Kolumny: `id`, `user_id` (FK profiles), `exempted_by`, `reason`, `created_at`
- RLS: tylko admin SELECT/INSERT/DELETE

### B. Aktualizacja RPC `get_my_mfa_config`
- Na początku sprawdza `mfa_exempt_users` — jeśli `auth.uid()` jest na liście, zwraca `required=false`

### C. UI w SecuritySettings — sekcja "Wykluczone z MFA"
- Wyszukiwarka użytkowników (po imieniu/nazwisku/email)
- Lista wykluczonych z możliwością usunięcia
- Zapis do `mfa_exempt_users`

### D. Ekran enrollmentu TOTP
- Nowy komponent `TOTPSetup` wyświetlany gdy metoda=totp/both i użytkownik nie ma zarejestrowanego faktora
- Wywołuje `supabase.auth.mfa.enroll({ factorType: 'totp' })` → wyświetla QR kod
- Po zeskanowaniu użytkownik wpisuje 6-cyfrowy kod → `mfa.challengeAndVerify()`
- Po weryfikacji przechodzi do normalnego logowania

### E. Poprawki SMTP (dostarczalność)
- Dodanie nagłówków `Message-ID`, `Date` w `send-mfa-code`
- Usunięcie kodu MFA z tematu wiadomości (bezpieczeństwo + mniej spamowe)
- Walidacja odpowiedzi SMTP na każdym kroku (MAIL FROM, RCPT TO)

### Pliki do zmiany:
- Nowa migracja SQL (tabela + RPC update)
- `src/components/admin/security/SecuritySettings.tsx` — sekcja wykluczeń
- `src/components/auth/MFAChallenge.tsx` — dodanie flow enrollmentu TOTP
- `supabase/functions/send-mfa-code/index.ts` — poprawki nagłówków SMTP

