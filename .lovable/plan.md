

# Dodanie interfejsu PIN keypad do weryfikacji MFA

## Co to zmienia

Zamiana standardowego pola tekstowego w `MFAChallenge.tsx` na wizualny interfejs z klawiaturą numeryczną (jak na screenie) — 6 kropek/dots + klawiatura 3×4 + przyciski Reset/LOGIN.

Backend i logika weryfikacji pozostają bez zmian — to czysto wizualna zmiana UI.

## Szczegóły techniczne

### 1. Nowy komponent `PinKeypad.tsx`

Komponent wielokrotnego użytku:
- 6 kółek (puste/wypełnione) pokazujących stan wpisywania
- Klawiatura numeryczna 3×4: 1-9, puste, 0, Reset
- Callback `onComplete(code: string)` gdy 6 cyfr wpisanych
- Przycisk "LOGIN" / "Weryfikuj" pod klawiaturą
- Animacja wypełniania kropek
- Obsługa klawiatury fizycznej (numery + Backspace)
- Stylizacja zbliżona do screena: ciemnoszare przyciski, cyan header, czerwony Reset

### 2. Aktualizacja `MFAChallenge.tsx`

Zamiana sekcji z `<Input>` na `<PinKeypad>`:
- Zamiast `<Input value={code} onChange={...} />` → `<PinKeypad onComplete={handleVerify} />`
- Zachowanie całej logiki: lockout, failed attempts, method switching, email/totp
- Reset PIN po błędnej weryfikacji

### 3. Aktualizacja `MFAEmergencyScreen.tsx`

Zamiana pola kodu w ekranie resetu na ten sam `PinKeypad`.

## Pliki

| Plik | Zmiana |
|------|--------|
| `src/components/auth/PinKeypad.tsx` | **NOWY** — komponent klawiatury PIN |
| `src/components/auth/MFAChallenge.tsx` | Zamiana `<Input>` na `<PinKeypad>` |
| `src/components/auth/MFAEmergencyScreen.tsx` | Zamiana `<Input>` na `<PinKeypad>` |

## Bez zmian

- Żadne edge functions
- Żadne migracje SQL
- Żadne nowe tabele
- Backend weryfikacji identyczny

