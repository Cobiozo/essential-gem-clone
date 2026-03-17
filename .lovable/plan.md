

# Plan: Walidacja danych w formularzu rejestracji gości

## Problem
Formularz akceptuje fikcyjne dane: dowolny tekst w polu telefonu, emaile z nieistniejącymi domenami (np. `aaa@bbb.ccc`).

## Rozwiązanie

### 1. Pole telefonu z wyborem prefiksu kraju (flaga)

Stworzyć komponent `PhoneInputWithPrefix` (`src/components/ui/phone-input-prefix.tsx`):
- Select z flagą kraju (emoji) i prefiksem (`+48`, `+49`, `+1`, `+44`, `+380` itd.) — lista ~15 najpopularniejszych krajów
- Domyślny prefiks na podstawie `lang` parametru (pl → +48, de → +49, en → +44)
- Pole input obok selecta przyjmujące **tylko cyfry**, bez spacji
- Wartość zwracana: `+48123456789` (prefiks + cyfry razem)
- Walidacja Zod: po odjęciu prefiksu — minimum 9 cyfr, tylko cyfry (regex `^\d{9,15}$`)
- Blokada wpisywania liter i spacji (onKeyDown filtruje non-digit)

### 2. Walidacja email — weryfikacja domeny

Dodać do schematu Zod niestandardową walidację `.refine()` dla pola email:
- Sprawdzić czy domena (po `@`) należy do listy znanych domen LUB ma prawidłowy format (min. 2 segmenty, TLD min. 2 znaki)
- Lista popularnych domen: `gmail.com`, `yahoo.com`, `outlook.com`, `wp.pl`, `o2.pl`, `onet.pl`, `interia.pl`, `gmx.de`, `web.de`, `t-online.de`, `hotmail.com`, `icloud.com`, `protonmail.com`
- Dla domen spoza listy: walidacja formatu — domena musi mieć TLD z listy prawdziwych TLD (min. 2 znaki, nie ciąg losowych liter typu `.ccc`)
- Dodać listę ~50 najpopularniejszych TLD (`.com`, `.pl`, `.de`, `.org`, `.net`, `.eu`, `.info`, `.uk`, `.us`, `.fr`, `.it`, `.es` itd.)
- Komunikat błędu: "Podaj email z istniejącą domeną" (zlokalizowany PL/EN/DE)

### 3. Zmiany w plikach

**Nowy plik:** `src/components/ui/phone-input-prefix.tsx`
- Komponent z Select (flaga + prefiks) + Input (cyfry)
- Props: `value`, `onChange`, `defaultCountry`, `required`, `placeholder`, `disabled`
- Lista krajów z emoji flag, kodami i prefiksami

**`src/pages/EventGuestRegistration.tsx`:**
- Import `PhoneInputWithPrefix`
- Zamienić `<Input>` w polu phone na `<PhoneInputWithPrefix defaultCountry={lang === 'de' ? 'DE' : lang === 'en' ? 'GB' : 'PL'} />`
- Zaktualizować schemat Zod: phone walidacja regex po usunięciu prefiksu `^\+\d{2,4}\d{9,15}$`
- Dodać `.refine()` na email sprawdzającą domenę

**`src/utils/invitationTemplates.ts`:**
- Dodać nowe etykiety błędów: `emailDomainError`, `phoneFormatError` (PL/EN/DE)
- Zaktualizować `RegistrationLabels` interface

### 4. Zachowanie kompatybilności
- Wartość phone przesyłana do RPC nie zmienia formatu (string)
- Brak zmian w bazie danych
- Żadne URL-e rejestracyjne się nie zmieniają
- Istniejące linki zaproszeniowe działają identycznie

