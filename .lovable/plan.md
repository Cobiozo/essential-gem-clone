

# Ujednolicenie formatu kodów OTP na PREFIX-XXXXXX

## Problem
Dwa systemy OTP używają różnych formatów:
- **Zdrowa Wiedza (ZW)**: Już naprawiony na `ZW-XXXXXX`
- **InfoLink (PL)**: Wciąż używa starego formatu `PL-XXXX-XX` z komponentem InputOTP (8 slotów z separatorami)

Formularz InfoLink używa komponentu `InputOTP` z 8 slotami i 2 separatorami — to jest źródło problemu z myślnikami i niekompatybilnością między urządzeniami.

## Zmiany

### 1. `supabase/functions/generate-infolink-otp/index.ts`
- Zmienić `generateOTPCode()`: generować `PL-XXXXXX` (6 znaków po prefiksie, bez drugiego myślnika)
- Zmienić z pętli 4+2 na jedną pętlę 6 znaków

### 2. `supabase/functions/validate-infolink-otp/index.ts` (linia 68)
- Dodać normalizację kodu: strip myślniki po prefiksie, szukać po obu formatach (nowy `PL-XXXXXX` i legacy `PL-XXXX-XX`)

### 3. `src/pages/InfoLinkPage.tsx`
- Zamienić komponent `InputOTP` (8 slotów + separatory) na prosty `Input` z prefiksem `PL-` — identyczny wzorzec jak na stronie Zdrowa Wiedza
- Zmienić `handleOTPSubmit`: kod = `PL-${raw}`, bez ręcznego dodawania myślników
- Walidacja: `raw.length !== 6` zamiast `otpValue.length < 8`
- Dodać `handleCodePaste` z auto-submit po wklejeniu pełnego kodu
- Usunąć import `InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator`

### 4. Deploy obu edge functions
- `generate-infolink-otp`
- `validate-infolink-otp`

## Efekt
Oba systemy OTP (ZW i PL) będą miały identyczny schemat: `PREFIX-XXXXXX`, identyczny UI (Input z prefiksem), identyczne działanie na desktop/mobile/tablet. Bez komponentu InputOTP — prosty input z auto-uppercase i smart paste.

