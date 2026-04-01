

# Audyt tłumaczeń + dodanie języka norweskiego

## Audyt: miejsca z brakującymi tłumaczeniami / hardkodowanymi językami

### A. Hardkodowane listy języków (brak norweskiego)

| Plik | Problem |
|------|---------|
| `src/components/LanguageSelector.tsx` | `languageToCountry` — tylko pl, en, de, it, es, fr, pt |
| `src/components/InvitationLanguageSelect.tsx` | `languageToCountry` — tylko pl, en, de, it, es, fr, pt |
| `src/components/ContentLanguageSelector.tsx` | `languageToCountry` — tylko pl, en, de, it, es, fr, pt |
| `src/types/knowledge.ts` | `LANGUAGE_OPTIONS` — tylko pl, en, de, it, es, fr, pt |
| `src/pages/OmegaBasePage.tsx` | `ExportLanguage = 'pl' \| 'de' \| 'en' \| 'it'` — brak no |
| `src/pages/OmegaBasePage.tsx` | `exportTranslations`, `getTranslation` — tylko pl, de, en, it |
| `src/components/admin/push-notifications/NotificationTemplatesPanel.tsx` | `supportedLanguages` — tylko pl, en, de, uk |
| `src/contexts/LanguageContext.tsx` | `type Language = 'pl' \| 'de' \| 'en' \| string` — kosmetycznie |

### B. Hardkodowane szablony bez norweskiego

| Plik | Problem |
|------|---------|
| `src/utils/invitationTemplates.ts` | `templates` (InvitationLabels) — tylko pl, en, de |
| `src/utils/invitationTemplates.ts` | `registrationTemplates` (RegistrationLabels) — tylko pl, en, de |
| `src/utils/invitationTemplates.ts` | `getDateLocale()` — switch tylko en, de, default pl |
| `supabase/functions/generate-hk-otp/index.ts` | `messageTemplates` — tylko pl, en, de |

### C. Hardkodowane `locale: pl` bez uwzględnienia języka użytkownika (57 plików!)

Ponad 57 plików używa `{ locale: pl }` z date-fns bez sprawdzania aktualnego języka. Przykłady:
- `ConversationView.tsx`, `NotificationBellEnhanced.tsx`, `LeaderApprovalView.tsx`
- `AdminGuestDashboard.tsx`, `GoogleCalendarManagement.tsx`, `OmegaTestForm.tsx`
- `PartnerMeetingBooking.tsx`, `LeaderMeetingSchedule.tsx`

Te pliki zawsze formatują daty po polsku, niezależnie od wybranego języka interfejsu.

### D. Brakujące klucze i18n

Wiele komponentów używa polskich stringów zamiast kluczy `t()`:
- Większość panelu admina (hardkodowane polskie etykiety)
- To jest świadomy wybór architektury (admin panel = polski), ale brak kluczy utrudnia ewentualne tłumaczenie

---

## Plan implementacji: dodanie norweskiego (no)

### 1. Wyodrębnić wspólny moduł `languageToCountry` (DRY)

**Nowy plik: `src/utils/languageFlags.ts`**

Wyodrębnić zduplikowany kod z 3 komponentów (`LanguageSelector`, `InvitationLanguageSelect`, `ContentLanguageSelector`) do jednego modułu:

```ts
export const languageToCountry: Record<string, string> = {
  'pl': 'pl', 'en': 'gb', 'de': 'de', 'it': 'it',
  'es': 'es', 'fr': 'fr', 'pt': 'pt', 'no': 'no',
};

export const getFlagUrl = (langCode: string): string => {
  const countryCode = languageToCountry[langCode] || langCode;
  return `https://flagcdn.com/w40/${countryCode}.png`;
};
```

Zaktualizować 3 komponenty żeby importowały z nowego modułu.

### 2. Dodać norweski do `LANGUAGE_OPTIONS` w `src/types/knowledge.ts`

```ts
{ code: 'no', label: '🇳🇴 Norsk', flag: '🇳🇴' }
```

### 3. Dodać norweski do `invitationTemplates.ts`

- Nowy wpis `no` w `templates` (InvitationLabels)
- Nowy wpis `no` w `registrationTemplates` (RegistrationLabels)
- Dodać `import { nb } from 'date-fns/locale'` i case `'no': return nb` w `getDateLocale()`

### 4. Dodać norweski do `OmegaBasePage.tsx`

- Rozszerzyć `ExportLanguage` o `'no'`
- Dodać norweskie tłumaczenia w `exportTranslations` i `getTranslation`

### 5. Dodać norweski do `NotificationTemplatesPanel.tsx`

```ts
{ code: 'no', name: 'Norsk' }
```

### 6. Dodać norweski do `generate-hk-otp` edge function

```ts
no: `Hei!\n\nJeg har et interessant materiale til deg:\n...`
```

### 7. Naprawić hardkodowane `locale: pl` w kluczowych komponentach

Stworzyć helper w `src/utils/dateLocale.ts`:
```ts
import { pl, enUS, de, nb } from 'date-fns/locale';
export function getAppDateLocale(lang: string): Locale {
  switch(lang) {
    case 'en': return enUS;
    case 'de': return de;
    case 'no': return nb;
    default: return pl;
  }
}
```

Zaktualizować kluczowe pliki (te widoczne dla użytkowników końcowych):
- `ConversationView.tsx`
- `NotificationBellEnhanced.tsx`
- `UserNotificationCenter.tsx`
- `PartnerMeetingBooking.tsx`
- `LeaderMeetingSchedule.tsx`
- `MyHkCodesHistory.tsx`
- I inne pliki korzystające z `locale: pl`

### 8. Dodać default fallback w `LanguageSelector`, `InvitationLanguageSelect`, `ContentLanguageSelector`

Upewnić się że statyczny fallback (gdy DB jest niedostępna) zawiera norweski:
```ts
{ code: 'no', name: 'Norwegian', native_name: 'Norsk' }
```

---

## Pliki do edycji (podsumowanie)

| Plik | Zmiana |
|------|--------|
| **NOWY** `src/utils/languageFlags.ts` | Wspólny moduł flag |
| **NOWY** `src/utils/dateLocale.ts` | Wspólny helper date-fns locale |
| `src/components/LanguageSelector.tsx` | Import z languageFlags, dodać NO do fallback |
| `src/components/InvitationLanguageSelect.tsx` | Import z languageFlags, dodać NO do fallback |
| `src/components/ContentLanguageSelector.tsx` | Import z languageFlags, dodać NO do fallback |
| `src/types/knowledge.ts` | Dodać NO do LANGUAGE_OPTIONS |
| `src/utils/invitationTemplates.ts` | Dodać norweskie szablony + nb locale |
| `src/pages/OmegaBasePage.tsx` | Rozszerzyć ExportLanguage + tłumaczenia |
| `src/components/admin/push-notifications/NotificationTemplatesPanel.tsx` | Dodać NO |
| `src/contexts/LanguageContext.tsx` | Kosmetyka typu Language |
| `supabase/functions/generate-hk-otp/index.ts` | Dodać NO template |
| ~15 plików z `locale: pl` | Zamienić na `getAppDateLocale(language)` |

## Bezpieczeństwo

- Edge functions auto-translate (`scheduled-translate-sync`, `background-translate`) pobierają języki dynamicznie z `i18n_languages` — norweski wystarczy dodać w panelu admina (lub migracją SQL)
- Żadne zmiany nie naruszają RLS, autentykacji ani logiki biznesowej
- Fallbacki zawsze wracają do polskiego jeśli tłumaczenie nie istnieje

