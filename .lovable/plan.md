

# Audyt MFA — znalezione problemy i plan napraw

## Znalezione problemy

### 1. Błąd CORS w `verify-mfa-code` (krytyczny — kody "nieprawidłowe")
Funkcja `verify-mfa-code` ma niekompletne nagłówki CORS:
```
// verify-mfa-code (BRAKUJĄCE):
'authorization, x-client-info, apikey, content-type'

// send-mfa-code (POPRAWNE):
'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, ...'
```
Klient Supabase wysyła dodatkowe nagłówki `x-supabase-client-platform*`. Przeglądarka blokuje preflight → request pada z CORS error → frontend łapie to jako "nieprawidłowy kod". To jest najprawdopodobniej **główna przyczyna** problemu z kodami.

### 2. Race condition — podwójne generowanie kodów
Dane z bazy pokazują, że dla niektórych użytkowników kody są generowane w odstępie 300-500ms (np. user `f21a30b2` ma kody o 07:55:07.275 i 07:55:07.596). Drugi request unieważnia pierwszy kod (`used = true`), ale email z pierwszym kodem już został wysłany — użytkownik wpisuje kod, który jest już unieważniony.

### 3. Brak `autocomplete="one-time-code"` — nie działa autouzupełnianie OTP na mobile
Na iOS i Android, jeśli pole ma atrybut `autocomplete="one-time-code"` i `inputMode="numeric"`, system operacyjny automatycznie podpowiada kod z otrzymanego emaila/SMS. Obecnie te atrybuty nie są ustawione.

### 4. Google Authenticator / Authy — już działa
TOTP enrollment (QR code + weryfikacja) jest już zaimplementowany w `TOTPSetup.tsx`. Obsługuje Google Authenticator, Authy i Microsoft Authenticator. Wymaga jedynie ustawienia metody MFA na `totp` lub `both` w panelu admina.

---

## Plan napraw

### A. `supabase/functions/verify-mfa-code/index.ts` — naprawa CORS
Zaktualizować `corsHeaders` o brakujące nagłówki platform (identyczne jak w `send-mfa-code`).

### B. `supabase/functions/send-mfa-code/index.ts` — ochrona przed race condition
Zmienić logikę invalidacji: zamiast ustawiać `used = true` na starych kodach, **nie invalidować** ich. Przy weryfikacji (`verify-mfa-code`) sprawdzać **najnowszy nieużyty i nieexpired kod** — w ten sposób nawet jeśli dwa kody zostaną wygenerowane, oba będą ważne, a weryfikacja zaakceptuje każdy z nich.

### C. `supabase/functions/verify-mfa-code/index.ts` — odporność na race condition
Zmienić query weryfikacji: zamiast szukać konkretnego kodu, szukać najnowszego nieużytego kodu dla danego użytkownika, który pasuje do wprowadzonego kodu (bez filtrowania `used = false` na starszych kodach, bo mogły zostać unieważnione przez race condition).

### D. `src/components/auth/MFAChallenge.tsx` — autouzupełnianie OTP na mobile
Dodać do pola kodu:
- `autoComplete="one-time-code"` — iOS/Android automatycznie podpowiada kod z emaila
- `inputMode="numeric"` — klawiatura numeryczna na mobile

### E. `src/components/auth/TOTPSetup.tsx` — te same atrybuty na polu kodu

---

## Odpowiedzi na pytania

**Automatyczne wklejanie kodu z emaila na telefonie/tablecie:**
Tak, jest to możliwe. Po dodaniu `autocomplete="one-time-code"` system iOS/Android rozpoznaje kody jednorazowe w emailach i wyświetla podpowiedź nad klawiaturą. Użytkownik tapuje podpowiedź i kod jest wpisywany automatycznie. Działa na Safari (iOS) i Chrome (Android).

**Google Authenticator / Authy:**
Już jest zaimplementowane. System TOTP (QR code enrollment) jest gotowy. W panelu admina wystarczy ustawić metodę MFA na "totp" lub "both" (oba: email + authenticator), aby użytkownicy mogli korzystać z aplikacji Authenticator.

---

## Pliki do zmiany
1. `supabase/functions/verify-mfa-code/index.ts` — CORS + logika weryfikacji
2. `supabase/functions/send-mfa-code/index.ts` — usunięcie invalidacji kodów
3. `src/components/auth/MFAChallenge.tsx` — atrybuty autouzupełniania
4. `src/components/auth/TOTPSetup.tsx` — atrybuty autouzupełniania

