

# Poprawka brakujących tłumaczeń w formularzu rejestracji

## Problem (widoczny na screenshocie)
- Label pola potwierdzenia email wyświetla niepoprawny tekst zamiast "Potwierdź email"
- Komunikat walidacji pokazuje surowy klucz `auth.emailsMatch` zamiast przetłumaczonego tekstu
- Analogicznie `auth.errors.emailsMismatch` nie jest przetłumaczony

## Przyczyna
Tłumaczenia są ładowane z bazy danych. Klucze `auth.confirmEmail`, `auth.emailsMatch`, `auth.errors.emailsMismatch` nie zostały dodane do bazy. Funkcja `t()` zwraca klucz jako fallback, natomiast `tf()` pozwala podać tekst zapasowy.

## Rozwiązanie

### `src/pages/Auth.tsx` — zmiana `t()` na `tf()` z polskimi fallbackami:
- `t('auth.confirmEmail')` → `tf('auth.confirmEmail', 'Potwierdź email')`
- `t('auth.errors.emailsMismatch')` → `tf('auth.errors.emailsMismatch', 'Adresy email nie są zgodne')`
- `t('auth.emailsMatch')` → `tf('auth.emailsMatch', 'Adresy email są zgodne')`

Dotyczy to zarówno labela, komunikatów walidacji pod polem, jak i komunikatu w `handleSignUp`.

### Pliki: 1
- `src/pages/Auth.tsx` — 4 miejsca do zmiany (3 w JSX + 1 w handleSignUp)

