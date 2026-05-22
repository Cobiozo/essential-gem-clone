# Naprawa kodu BW- w bazie wiedzy

## Problem
Gość po wpisaniu kodu (np. `BW-7837`) widzi błąd: **"Edge Function returned a non-2xx status code"** i nie może wejść do materiału.

## Przyczyna
W edge function `validate-hk-otp/index.ts` po refaktorze (obsługa formatu `BW-XXXX` obok starego `ZW-XXXXXX`) pozostały dwa odwołania do nieistniejącej już zmiennej `normalizedCode`:

- linia 115: `console.log(...HK OTP ${normalizedCode}...)`
- linia 193: `console.log(...Validated HK OTP ${normalizedCode}...)`

Zmienna została zastąpiona przez `bwCode` / `zwCode` / `stripped`, ale stare `console.log` nie zostały zaktualizowane. Przy pierwszym użyciu kodu (po updacie `first_used_at`) interpreter wykonuje linię 115 → `ReferenceError: normalizedCode is not defined` → blok `catch` zwraca HTTP 500 → frontend pokazuje czerwony komunikat.

## Naprawa
W `supabase/functions/validate-hk-otp/index.ts` zamienić obie referencje `${normalizedCode}` na `${bwCode}` (czytelna, znormalizowana postać kodu używana do logów).

Brak innych zmian — logika walidacji, sesji, signed URL pozostaje bez zmian.

## Walidacja
Po wdrożeniu sprawdzić logi `validate-hk-otp` po ponownym wpisaniu kodu `BW-7837` — powinien zwrócić `200 OK` z `session_token` i materiał załaduje się poprawnie.
