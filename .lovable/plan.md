## Co ustaliłem (audyt)

- `send-password-reset` generuje link przez `auth.admin.generateLink({ type: 'recovery', options: { redirectTo: 'https://purelifecenter.pl/reset-password' }})` i wstawia `action_link` do szablonu `password_reset` (szablon jest aktywny i poprawny — używa `{{link_resetowania}}`).
- Zrzut ekranu pokazuje, że po kliknięciu przeglądarka ląduje na `localhost:3000` (ERR_CONNECTION_FAILED). To klasyczny objaw: GoTrue odrzuca `redirect_to`, bo adres nie jest na liście dozwolonych Redirect URLs, i przekierowuje na skonfigurowany Site URL — który w tym projekcie wskazuje na `localhost:3000`. Konfiguracji Auth nie mogę odczytać z poziomu narzędzi, więc to hipoteza zgodna z dowodami, a nie potwierdzony odczyt — weryfikacja jest pierwszym krokiem planu.
- Strona `/reset-password` istnieje i działa poprawnie **tylko** dla klasycznego linku z hashem (sesja recovery). Nie obsługuje parametru `token_hash`.
- Szablon `password_changed` istnieje w bazie i jest aktywny, ale **żadna funkcja go nie wysyła** — użytkownik nie dostaje potwierdzenia zmiany hasła. Treść mówi ogólnie „skontaktuj się z administracją”, bez adresu support.

## Plan naprawy

### 1. Weryfikacja konfiguracji Auth
Sprawdzić Site URL i Redirect URLs w ustawieniach Auth; ustawić Site URL na `https://purelifecenter.pl` i dodać do allow-listy `https://purelifecenter.pl/**` oraz adresy preview. To usuwa źródło problemu.

### 2. Link odporny na konfigurację (główna zmiana)
Zamiast polegać na `action_link` GoTrue:
- w `send-password-reset` pobrać z `generateLink` pole `properties.hashed_token`,
- zbudować własny link: `{app_base_url}/reset-password?token_hash=<hashed_token>&type=recovery`, gdzie `app_base_url` czytamy z ustawień strony (fallback `https://purelifecenter.pl`),
- ten link nie przechodzi przez przekierowanie GoTrue, więc nigdy nie trafi na `localhost`.

### 3. Obsługa token_hash w `/reset-password`
W `src/pages/ResetPassword.tsx`:
- odczytać `token_hash` + `type=recovery` z query stringa i wywołać `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`, co tworzy sesję recovery,
- zachować dotychczasową ścieżkę hash/`PASSWORD_RECOVERY` jako fallback dla starych linków,
- po weryfikacji wyczyścić parametry z URL,
- czytelne komunikaty: link wygasł / już użyty / nieprawidłowy, z przyciskiem „Wyślij nowy link”.

### 4. E-mail o zmianie hasła
- Nowa funkcja edge `send-password-changed-notification` (ten sam mechanizm SMTP i logowania do `email_logs`, co `send-password-reset`), używająca szablonu `password_changed` ze zmiennymi `imię`, `data`, `godzina`.
- Wywoływana z `/reset-password` po udanym `updateUser({ password })` (oraz z miejsca zmiany hasła w profilu, jeśli istnieje — sprawdzę przy implementacji).
- Aktualizacja treści szablonu `password_changed`: „Jeżeli to nie Ty zmieniałeś hasło, natychmiast skontaktuj się z supportem: support@purelifecenter.pl”.

### 5. Test end-to-end
Wywołanie funkcji resetu dla konta testowego, sprawdzenie logów (`email_logs`, logi funkcji), przejście linku w przeglądarce, ustawienie hasła, potwierdzenie że przyszedł e-mail o zmianie.

## Szczegóły techniczne
- Pliki: `supabase/functions/send-password-reset/index.ts`, nowy `supabase/functions/send-password-changed-notification/index.ts`, `supabase/config.toml` (verify_jwt=false dla nowej funkcji), `src/pages/ResetPassword.tsx`.
- Zmiana treści szablonu `password_changed` przez update danych w `email_templates`.
- Bez zmian w schemacie bazy.
