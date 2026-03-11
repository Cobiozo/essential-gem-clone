

# Poprawa formatu wiadomości OTP i usunięcie ostatniego myślnika z kodu

## Zmiany

### 1. Nowy format kodu OTP: `ZW-XXXXXX` (bez ostatniego myślnika)

**Edge function** `supabase/functions/generate-hk-otp/index.ts` - zmiana `generateOTPCode()`:
- Generować 6 znaków po `ZW-` bez dodatkowego myślnika: `ZW-XXXXXX`

**Edge function** `supabase/functions/validate-hk-otp/index.ts`:
- Bez zmian - normalizacja (`toUpperCase().trim()`) i porównanie `eq('code', normalizedCode)` działa niezależnie od formatu.

**Strona publiczna** `src/pages/HealthyKnowledgePublicPage.tsx`:
- Zmienić `cleanCode`: strip `ZW-` i myślniki, max 6 znaków (bez zmian w logice)
- Zmienić `formattedCode`: z `ZW-${raw.slice(0,4)}-${raw.slice(4,6)}` na `ZW-${raw}` (bez drugiego myślnika)
- Zmienić hint: z `ZW-XXXX-XX` na `ZW-XXXXXX`
- Zmienić `formatDisplay`: wyświetlać 6 znaków bez dodatkowego myślnika

### 2. Lepszy format wiadomości - więcej podziału na wiersze

**Edge function** `supabase/functions/generate-hk-otp/index.ts` - domyślny template:
```
Cześć!

Mam dla Ciebie ciekawy materiał:
"{title}"

{description}

Wejdź na link poniżej i użyj kodu dostępu:

🔗 Link:
{share_url}

🔑 Kod dostępu:
{otp_code}

⏰ Po pierwszym użyciu masz {validity_hours} godzin dostępu.

Pozdrawiam,
{partner_name}
```

**Frontend** `src/types/healthyKnowledge.ts` - zaktualizować `DEFAULT_SHARE_MESSAGE_TEMPLATE` analogicznie.

### Pliki do edycji
1. `supabase/functions/generate-hk-otp/index.ts` - format kodu + template
2. `supabase/functions/validate-hk-otp/index.ts` - brak zmian potrzebnych
3. `src/pages/HealthyKnowledgePublicPage.tsx` - format wyświetlania i walidacji
4. `src/types/healthyKnowledge.ts` - default template

Po edycji kodu: deploy edge function `generate-hk-otp`.

