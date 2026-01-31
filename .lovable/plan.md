
# Plan: Rozszerzenie listy obsługiwanych stref czasowych

## Problem

System nie rozpoznaje strefy czasowej Nowej Fundlandii (Kanada) która ma unikatowy offset **UTC-3:30**. Przeglądarka zwraca `America/St_Johns` ale tej strefy nie ma w słowniku `TIMEZONE_ABBREVIATIONS`.

Aktualnie obsługiwanych jest tylko około 30 stref czasowych, a na świecie jest ich ponad 400.

## Rozwiązanie

Rozszerzyć plik `src/utils/timezoneHelpers.ts` o brakujące strefy czasowe, w tym:

### 1. Kanada - wszystkie strefy
- `America/St_Johns` - Nowa Fundlandia (NST, UTC-3:30)
- `America/Halifax` - Atlantycka Kanada (AST)
- `America/Winnipeg` - Manitoba (CST)
- `America/Edmonton` - Alberta (MST)
- `America/Regina` - Saskatchewan (CST, bez DST)

### 2. USA - brakujące strefy
- `America/Phoenix` - Arizona (MST, bez DST)
- `America/Anchorage` - Alaska (AKST)
- `Pacific/Honolulu` - Hawaje (HST)

### 3. Ameryka Środkowa i Południowa
- `America/Mexico_City` - Meksyk (CST)
- `America/Bogota` - Kolumbia (COT)
- `America/Lima` - Peru (PET)
- `America/Santiago` - Chile (CLT)
- `America/Buenos_Aires` - Argentyna (ART)

### 4. Azja - rozszerzenie
- `Asia/Jerusalem` / `Asia/Hebron` - Izrael/Palestyna (IST)
- `Asia/Bangkok` - Tajlandia (ICT)
- `Asia/Jakarta` - Indonezja (WIB)
- `Asia/Seoul` - Korea (KST)
- `Asia/Manila` - Filipiny (PHT)
- `Asia/Karachi` - Pakistan (PKT)
- `Asia/Dhaka` - Bangladesz (BST)
- `Asia/Kathmandu` - Nepal (NPT, UTC+5:45)
- `Asia/Almaty` - Kazachstan (ALMT)

### 5. Bliski Wschód i Afryka
- `Africa/Cairo` - Egipt (EET)
- `Africa/Lagos` - Nigeria (WAT)
- `Africa/Johannesburg` - RPA (SAST)
- `Africa/Nairobi` - Kenia (EAT)
- `Asia/Riyadh` - Arabia Saudyjska (AST)
- `Asia/Tehran` - Iran (IRST, UTC+3:30)

### 6. Oceania
- `Australia/Brisbane` - Queensland (AEST, bez DST)
- `Australia/Adelaide` - Australia Pd. (ACST)
- `Australia/Darwin` - Terytorium Północne (ACST)
- `Pacific/Fiji` - Fidżi (FJT)
- `Pacific/Guam` - Guam (ChST)

### 7. Europa - uzupełnienia
- `Europe/Moscow` - Rosja (MSK)
- `Europe/Istanbul` - Turcja (TRT)
- `Europe/Zurich` - Szwajcaria (CET)

## Zmiany w pliku

### `src/utils/timezoneHelpers.ts`

**Rozszerzenie `TIMEZONE_ABBREVIATIONS`** - dodanie około 50 nowych stref czasowych do słownika.

**Rozszerzenie `COMMON_TIMEZONES`** - opcjonalnie dodanie popularnych stref do selektora (dla adminów tworzących wydarzenia).

## Fallback dla nieznanych stref

Aktualna implementacja już ma fallback:
```typescript
export const getTimezoneAbbr = (timezone: string): string => {
  if (!timezone) return 'CET';
  return TIMEZONE_ABBREVIATIONS[timezone] || timezone.split('/').pop() || 'UTC';
};
```

Czyli dla `America/St_Johns` zwróci `St_Johns` zamiast `NST`. Po dodaniu do słownika zwróci poprawny skrót.

## Rezultat

Po zmianie użytkownik z Nowej Fundlandii zobaczy:
- Poprawny skrót strefy: `NST` zamiast `St_Johns`
- Poprawne obliczenie różnicy czasu (UTC-3:30 vs Warsaw UTC+1 = 4.5h różnicy)

Wydarzenie o 10:00 Warsaw będzie wyświetlane jako:
- **Twój czas:** 05:30 (St Johns) ← poprawnie -4:30 różnicy
- **Czas wydarzenia:** 10:00 (Warsaw)
