

# Potwierdzenie adresu email przy rejestracji

## Zmiana

Dodanie pola "Potwierdź email" w formularzu rejestracji (`src/pages/Auth.tsx`), zaraz pod polem email. Rejestracja blokowana jeśli adresy się nie zgadzają.

## Szczegóły

### `src/pages/Auth.tsx`
- Nowy state: `confirmEmail` (analogicznie do `confirmPassword`)
- Nowe pole input pod emailem z labelem "Potwierdź email" i `type="email"`
- Walidacja w `handleSignUp`: porównanie `email` z `confirmEmail` (case-insensitive trim). Jeśli różne → błąd i przerwanie rejestracji
- Clear `confirmEmail` po udanej rejestracji (linia 553 area)
- Opcjonalnie: wizualna informacja pod polem (zielona/czerwona) czy emaile się zgadzają

### Tłumaczenia
- Dodanie kluczy `auth.confirmEmail`, `auth.errors.emailsMismatch` w plikach tłumaczeń (pl/en)

### Pliki: ~3
- `src/pages/Auth.tsx` — state + pole + walidacja
- Pliki tłumaczeń (pl, en) — nowe klucze

