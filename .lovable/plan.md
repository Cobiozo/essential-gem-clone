

# Plan: Naprawa formularza rejestracji na wydarzenie (email i telefon)

## Znalezione problemy

### 1. BUG KRYTYCZNY: Walidacja telefonu odrzuca numery z USA (i inne krótkie prefiksy)

Funkcja `isValidPhoneDigits` (linia 105-111) używa regex `/^\+\d{1,4}(\d+)$/` do wyodrębnienia cyfr po prefiksie. Problem: `\d{1,4}` jest **zachłanne** (greedy) — dla numeru US `+11234567890`:
- `\d{1,4}` pochłania `1123` (4 cyfry)
- Grupa przechwytująca dostaje tylko `4567890` = 7 cyfr
- Walidacja wymaga ≥9 cyfr → **ODRZUCENIE prawidłowego numeru**

Ten sam problem dotyczy wszystkich krajów z krótkim prefiksem (+1, +7).

### 2. Ograniczona lista krajów w selektorze telefonu

`PhoneInputWithPrefix` ma tylko 18 krajów (głównie Europa). Brak m.in.: Kanada, Australia, Japonia, Indie, Brazylia, Meksyk, RPA, Węgry, Chorwacja, Grecja, Portugalia, Dania, Finlandia, Irlandia i wiele innych.

### 3. Niepełna lista TLD w walidacji emaila

Lista `VALID_TLDS` nie zawiera niektórych popularnych domen, np.: `ru`, `ua`, `tr`, `gr`, `se`, `no`, `dk`, `fi`, `lt`, `lv`, `ee`, `hr`, `rs`, `bg`, `is`, `id`, `th`, `vn`, `sg`, `hk`, `tw`, `live`, `outlook`, `mail`, `club`, `space`, `digital`, `agency`, `marketing`.

## Plan naprawy

### Plik 1: `src/pages/EventGuestRegistration.tsx`

**A) Naprawić `isValidPhoneDigits`** (linie 105-111) — zamiast regex, porównać z listą znanych prefiksów i wyodrębnić resztę. Alternatywnie: zmienić logikę na sprawdzanie łącznej długości numeru (prefix + digits ≥ 10 znaków) i minimalnej ilości cyfr po usunięciu prefiksu.

Nowa logika:
```typescript
const isValidPhoneDigits = (phone: string): boolean => {
  if (!phone || !phone.startsWith('+')) return false;
  const digits = phone.replace(/[^\d]/g, '');
  // Minimum 7 cyfr (np. +1 + 7 cyfr dla krótszych numerów)  
  // Maximum 15 cyfr (standard ITU-T E.164)
  return digits.length >= 7 && digits.length <= 15;
};
```

**B) Rozszerzyć listę `VALID_TLDS`** (linie 81-89) — dodać brakujące popularne TLD.

### Plik 2: `src/components/ui/phone-input-prefix.tsx`

**Rozszerzyć listę krajów** — dodać minimum 20 brakujących krajów (US/CA, AU, NZ, JP, IN, BR, MX, ZA, HU, HR, GR, PT, DK, FI, IE, LT, LV, EE, TR, RU, IL i inne). Posortować alfabetycznie lub pogrupować popularne na górze.

## Pliki do zmiany
- `src/pages/EventGuestRegistration.tsx` — naprawa walidacji telefonu + rozszerzenie TLD
- `src/components/ui/phone-input-prefix.tsx` — rozszerzenie listy krajów

