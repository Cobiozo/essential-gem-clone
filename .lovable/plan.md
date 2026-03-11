

# Fix: Formularz OTP — placeholder z myślnikiem + walidacja nie normalizuje kodów

## Problem

1. **Placeholder** wciąż pokazuje `XXXX-XX` (z myślnikiem) i `maxLength=7` — powinno być `XXXXXX` i `maxLength=6`
2. **Edge function `validate-hk-otp`** — normalizacja kodu robi tylko `toUpperCase().trim()`, ale nie usuwa dodatkowych myślników. Stare kody w bazie mają format `ZW-XXXX-XX`, a frontend wysyła `ZW-XXXXXX` — brak dopasowania = błąd 401.

## Zmiany

### 1. `src/pages/HealthyKnowledgePublicPage.tsx` (linie 335-336)
- Placeholder: `"XXXX-XX"` → `"XXXXXX"`
- maxLength: `7` → `6`

### 2. `supabase/functions/validate-hk-otp/index.ts` (linia 40)
Normalizacja kodu musi usunąć wszystkie myślniki po prefiksie `ZW-`, żeby obsługiwać zarówno stare (`ZW-XXXX-XX`) jak i nowe (`ZW-XXXXXX`) kody:

```typescript
// Normalize: strip all hyphens after ZW- prefix, uppercase
const rawCode = otp_code.toUpperCase().trim();
const stripped = rawCode.replace(/^ZW-?/, '').replace(/-/g, '');
const normalizedCode = `ZW-${stripped}`;
```

Oraz zmienić lookup w bazie — porównywać po stripped 6 znakach zamiast exact match, albo lepiej: znormalizować obie strony. Najprostsze rozwiązanie: szukać po obu formatach:

```typescript
const { data: otpCodeRecord } = await supabase
  .from('hk_otp_codes')
  .select('*')
  .in('code', [normalizedCode, `ZW-${stripped.slice(0,4)}-${stripped.slice(4)}`])
  .eq('knowledge_id', knowledge.id)
  .eq('is_invalidated', false)
  .gt('expires_at', new Date().toISOString())
  .single();
```

### 3. Deploy `validate-hk-otp`

### Pliki
1. `src/pages/HealthyKnowledgePublicPage.tsx` — placeholder + maxLength
2. `supabase/functions/validate-hk-otp/index.ts` — normalizacja kodu OTP
3. Deploy edge function

