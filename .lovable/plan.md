

# Tlumaczenie tresci stopki dashboardu (DashboardFooterSection)

## Problem

Komponent `DashboardFooterSection.tsx` pobiera tresci z tabeli `dashboard_footer_settings` w bazie danych. Te tresci sa zapisane po polsku. Komponent ma fallbacki `t('footer.xxx')`, ale sa one uzywane TYLKO gdy `settings` jest null - co praktycznie nigdy nie zachodzi, bo rekord w bazie istnieje.

Wzorzec w kodzie:
```text
{settings?.quote_text || t('footer.quote')}
```
Poniewaz `settings.quote_text` zawsze ma wartosc ("Zmieniamy zycie..."), `t('footer.quote')` nigdy sie nie wykona.

Dodatkowo "Zainstaluj aplikacje" (linia 169) jest hardcoded bez t().

## Rozwiazanie

Odwrocic logike: uzywac `t()` jako zrodla glownego, a `settings` tylko jako fallback dla jezyka domyslnego (PL). Dzieki temu:
- Dla PL: wyswietli `settings` z bazy (edytowalne przez admina)
- Dla innych jezykow: wyswietli tlumaczenie z systemu i18n (`t()`)

### Zmiana w DashboardFooterSection.tsx

Dodac `language` z `useLanguage()` i zmienic kazde wyrazenie z:
```text
{settings?.quote_text || t('footer.quote')}
```
na:
```text
{language === 'pl' ? (settings?.quote_text || t('footer.quote')) : (t('footer.quote') || settings?.quote_text)}
```

Dotyczy to nastepujacych pol (okolo 12 miejsc):
- `quote_text` / `footer.quote`
- `mission_statement` / `footer.missionStatement`
- `team_title` / `footer.teamTitle`
- `team_description` / `footer.teamDescription`
- `feature_1_title`, `feature_1_description` / `footer.passion`, `footer.passionDescription`
- `feature_2_title`, `feature_2_description` / `footer.community`, `footer.communityDescription`
- `feature_3_title`, `feature_3_description` / `footer.missionTitle`, `footer.missionDescription`
- `contact_title` / `footer.contact`
- `contact_description` / `footer.contactDescription`
- `contact_reminder` / `footer.contactReminder`
- `contact_email_label` / `footer.emailSupport`

Dodatkowo:
- Zamienic `'Zainstaluj aplikacje'` na `t('footer.installApp') || 'Zainstaluj aplikacje'`

### Uproszczenie - helper function

Aby nie powtarzac logiki, stworzyc helper w komponencie:
```typescript
const { t, language } = useLanguage();

const ft = (settingsValue: string | undefined, translationKey: string) => {
  if (language === 'pl') return settingsValue || t(translationKey);
  const translated = t(translationKey);
  // Jesli t() zwraca sam klucz (brak tlumaczenia), uzyj settings jako fallback
  return translated !== translationKey ? translated : (settingsValue || translated);
};
```

Wtedy kazde uzycie staje sie proste:
```text
{ft(settings?.quote_text, 'footer.quote')}
```

## Plik do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/widgets/DashboardFooterSection.tsx` | Dodac helper `ft()`, zamienic ~12 wyrazen, dodac t() dla "Zainstaluj aplikacje" |

## Warunek

Klucze `footer.*` musza istniec w bazie `i18n_translations` z tlumaczeniami na inne jezyki. Jezeli ich nie ma, system wyswietli polskie `settings` jako fallback - czyli zachowanie nie pogorszy sie.
