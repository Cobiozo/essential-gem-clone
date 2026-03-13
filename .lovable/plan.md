
Diagnoza (potwierdzona na runtime):
1) `security_settings` ma poprawne wartości (`mfa_enforcement=true`, `mfa_method=email`, `mfa_required_roles=["client"]`), a użytkownik `sebastiansnopek210587@gmail.com` ma rolę `client`.
2) RLS na `security_settings` pozwala SELECT tylko adminowi. Klient nie może odczytać ustawień MFA.
3) `AuthContext` i `MFAChallenge` czytają `security_settings` bezpośrednio z klienta, więc dla roli `client` dostają brak danych -> `mfaPending` nie włącza się.
4) Brak logów `send-mfa-code` i brak rekordów w `mfa_email_codes` potwierdza, że funkcja MFA nie jest w ogóle wywoływana.
5) `send-security-report` działa na poziomie SMTP (logi pokazują pełną sekwencję wysyłki), więc problem raportu to raczej UX/feedback albo dostarczalność skrzynki, nie sam transport SMTP.

Plan naprawy:
1) Backend: dodać bezpieczny RPC (SECURITY DEFINER) do odczytu MFA dla bieżącego użytkownika
   - nowa funkcja np. `public.get_my_mfa_config()`
   - zwraca: `{ required: boolean, method: 'email'|'totp'|'both', role: text }`
   - logika: czyta `security_settings` + rolę z `user_roles`, wylicza czy MFA jest wymagane dla `auth.uid()`
   - dzięki temu nie luzujemy RLS na `security_settings`.

2) Frontend auth gate: przepiąć `AuthContext` z bezpośredniego SELECT na `supabase.rpc('get_my_mfa_config')`
   - jeśli `required=true` -> `setMfaPending(true)`
   - zapisać metodę MFA w stanie kontekstu (np. `mfaMethod`)
   - zostawić hard gate w `App.tsx` (`user && mfaPending` -> tylko `MFAChallenge`).

3) Frontend challenge: usunąć odczyt `security_settings` z `MFAChallenge`
   - metoda MFA z props/context (z `AuthContext`)
   - dla `email` auto-wywołanie `send-mfa-code` po wejściu na challenge
   - przy błędzie wysyłki pokazać wyraźny komunikat i przycisk ponowienia (bez cichego faila).

4) Edge function `send-mfa-code`: poprawić semantykę błędów
   - teraz przy błędzie SMTP funkcja zwraca `success: true`; to trzeba zmienić
   - ma zwracać HTTP 500 + `{ error: ... }` gdy mail nie wyszedł
   - walidować błędy DB (`update/insert`) i nie ignorować ich
   - dodać pełne nagłówki CORS zgodne z klientem web.

5) `send-security-report`: doprecyzować feedback i diagnostykę
   - w UI pokazywać rzeczywisty wynik odpowiedzi (success/error/details)
   - dodać krótką informację “SMTP accepted” vs “delivery may take time/spam folder” (bo transport działa)
   - opcjonalnie dodać log “last test send status” w panelu.

6) Weryfikacja po wdrożeniu (end-to-end):
   - logowanie kontem `client` musi zawsze zatrzymać na MFA przed `/dashboard`
   - po wejściu na MFA musi pojawić się wpis w logach `send-mfa-code` i rekord w `mfa_email_codes`
   - bez poprawnego kodu brak dostępu do pulpitu
   - test raportu z panelu admina: odpowiedź success + wpis w logach funkcji + potwierdzenie dostarczenia na skrzynce.
