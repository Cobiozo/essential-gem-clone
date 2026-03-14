
Do I know what the issue is? Tak.

## Co jest zepsute (potwierdzone)
- UI wysyła kod poprawnie (`send-mfa-code` działa, SMTP OK).
- Błąd pojawia się przy `self-reset-mfa`: `Expected parameter to be UUID but is not`.
- W `self-reset-mfa` czynniki MFA są czytane z `factorsData?.factors`, a w tym projekcie poprawny kształt to `factorsData?.totp` (jak w działającym `reset-user-mfa`).
- Przez to do `deleteFactor` trafia niepoprawny `factorId` i reset kończy się 500.
- Dodatkowo logowanie akcji używa nieistniejących kolumn (`activity_type`, `description`, `metadata`) zamiast (`action_type`, `action_data`) w `user_activity_log`.

## Plan naprawy
1. **Naprawić Edge Function `self-reset-mfa`**
   - Zmienić pobieranie faktorów na `factorsData?.totp ?? []`.
   - Dodać walidację `factor.id` (UUID) przed `deleteFactor`.
   - Obsłużyć bezpiecznie przypadek „brak faktorów” jako `success: true` (idempotentny reset).
   - Ujednolicić strukturę odpowiedzi błędów (`success: false`, czytelny `error`).

2. **Naprawić zapis audytu**
   - W `self-reset-mfa` zapisywać do `user_activity_log` przez istniejące pola:
     - `action_type: 'mfa_self_reset'`
     - `action_data: { deleted_factor_count, total_factors_found, ip }`
   - Nie blokować sukcesu resetu, jeśli sam audyt się nie zapisze (log only).

3. **Poprawić komunikat błędu w UI (`MFAEmergencyScreen`)**
   - Przy `invoke('self-reset-mfa')` wyświetlać konkretny komunikat z payloadu odpowiedzi, zamiast ogólnego „non-2xx”.
   - Tekst dla użytkownika: np. „Reset nie powiódł się po stronie serwera. Kliknij ‘Wyślij kod ponownie’ albo użyj Support.”

4. **Walidacja po wdrożeniu**
   - Scenariusz E2E: wyślij kod → wpisz kod → `self-reset-mfa` zwraca 200 → przycisk „Skonfiguruj nowy Authenticator”.
   - Potwierdzić w logach funkcji brak błędu UUID.
   - Potwierdzić, że po resecie można od razu ponowić parowanie QR.
   - Sprawdzić fallback: jeśli reset nie przejdzie, działa „Zgłoś problem do Support”.

## Tymczasowe wyjście dla użytkownika (do czasu poprawki)
- Użyć przycisku **„Zgłoś problem do Support”**.
- Administrator może wykonać zdalny reset przez działającą funkcję **`reset-user-mfa`**.
