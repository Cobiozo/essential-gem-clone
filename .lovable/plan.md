# Podgląd hasła (ikonka oka) w formularzach rejestracji

## Cel
Każde pole hasła w formularzach rejestracji ma mieć po prawej stronie inputa przycisk z ikoną oka (Eye / EyeOff z `lucide-react`), który przełącza widoczność wpisanego hasła (`type="password"` ↔ `type="text"`).

## Zakres
Dodanie przycisku w następujących miejscach:

1. **`src/pages/Auth.tsx`** — rejestracja standardowa: pola „Hasło" i „Potwierdź hasło" (drugi screenshot).
2. **`src/pages/GuestRegister.tsx`** — rejestracja gościa: pole „Hasło" (pierwszy screenshot).
3. **`src/pages/MyAccount.tsx`** — zmiana hasła (analogicznie, dla spójności).
4. **`src/pages/Admin.tsx`** — formularze tworzenia/zmiany hasła użytkownika (jeśli występują pola password).

Logowanie (Auth - tryb logowania) — również dodać, żeby zachować spójny pattern.

## Implementacja

- Lokalny stan `showPassword` / `showConfirmPassword` (`useState<boolean>`).
- Wrapper `relative` wokół `<Input>`, ikona pozycjonowana `absolute right-3 top-1/2 -translate-y-1/2`.
- Komponent ikony: `Eye` gdy hasło ukryte, `EyeOff` gdy widoczne (`lucide-react`).
- `<button type="button" tabIndex={-1} aria-label="Pokaż hasło" />` — żeby nie submitował formularza.
- Padding inputa: `pr-10`, by tekst nie nachodził na ikonę.
- Kolory zgodne z design system (`text-muted-foreground hover:text-foreground`).

## Brak zmian
Logika rejestracji, walidacji i submit pozostaje bez zmian — tylko warstwa prezentacji.
