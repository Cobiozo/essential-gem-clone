
# Naprawienie pola OTP -- obsługa liter, cyfr i wklejania

## Problem
Komponent `InputOTP` (z biblioteki `input-otp`) domyślnie wymusza klawiaturę numeryczną i akceptuje tylko cyfry. Kody OTP w formacie ZW-XXXX-XX zawierają litery i cyfry (np. `ZW-A3BK-7N`), więc użytkownik nie może ich wpisać ani wkleić.

## Rozwiązanie

**Plik: `src/pages/HealthyKnowledgePublicPage.tsx`**

Zamiana komponentu `InputOTP` na zwykły `<Input>` z odpowiednią logiką:

- Pole tekstowe z `inputMode="text"` (pełna klawiatura na mobile)
- Automatyczna konwersja na wielkie litery (`toUpperCase`)
- Filtrowanie do dozwolonych znaków: `A-Z, 0-9` (bez O, I, 0, 1 -- zgodnie z generatorem)
- Obsługa wklejania pełnego kodu: jeśli użytkownik wklei `ZW-A3BK-7N`, automatycznie usunąć prefiks `ZW-` i myślniki, wyciągnąć 6 znaków
- Placeholder: `XXXX-XX`
- Maksymalnie 6 znaków (bez myślników)
- Wizualne formatowanie: wyświetlanie `ZW-` jako prefix (jak jest teraz) + pole z auto-formatowaniem wpisywanego kodu

### Szczegóły:
1. Usunięcie importu `InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator`
2. Dodanie zwykłego `<Input>` z:
   - `value` wyświetlany z auto-formatowaniem (np. `A3BK-7N`)
   - `onChange` filtrujący niedozwolone znaki i konwertujący na uppercase
   - `onPaste` obsługujący wklejanie pełnych kodów (z prefiksem ZW- lub bez)
   - `maxLength={7}` (6 znaków + 1 myślnik wizualny) lub prosta 6-znakowa maska
   - `autoComplete="off"`, `spellCheck={false}`
3. Przycisk "Uzyskaj dostęp" aktywny gdy 6 znaków alfanumerycznych

### Logika paste:
```
Wklejone: "ZW-A3BK-7N" -> wyciągamy "A3BK7N" (6 znaków)
Wklejone: "A3BK-7N"    -> wyciągamy "A3BK7N" (6 znaków)  
Wklejone: "A3BK7N"     -> używamy bezpośrednio
```

## Plik do zmiany
- `src/pages/HealthyKnowledgePublicPage.tsx` -- zamiana InputOTP na Input z pełną obsługą alfanumeryczną i paste
