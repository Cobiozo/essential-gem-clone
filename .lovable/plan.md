

# Naprawa ankiety — 3 problemy

## Znalezione przyczyny

1. **Logo w modalu ankiety** — `SurveyModal.tsx` nie zawiera żadnego logo. Trzeba dodać logo Pure Life Center (`src/assets/pure-life-logo-new.png`) w lewym górnym rogu modala.

2. **"PLC OMEGA BASE" na landing page** — `MedicalChatWidget` renderuje się na stronach partnerów, bo `ChatWidgetsWrapper` w `App.tsx` ukrywa widget tylko na `/infolink/` i `/meeting-room/`, ale nie na stronach partnerów (`/:alias`). Trzeba dodać wykluczenie dla stron partnerskich.

3. **Drugi przycisk CTA z `#ankieta` nie otwiera ankiety** — `HeroSection.tsx` ma `cta_secondary` renderowany jako zwykły `<a>` bez logiki przechwytywania `#ankieta`. Trzeba dodać `onSurveyOpen` prop do `HeroSection` i obsłużyć kliknięcie secondary CTA tak samo jak w `CtaBannerSection` i `HeaderSection`.

## Zmiany

### 1. `src/components/partner-page/sections/SurveyModal.tsx`
- Zaimportować logo: `import logo from '@/assets/pure-life-logo-new.png'`
- Dodać `<img>` z logo w lewym górnym rogu modala (sticky, obok przycisku X)

### 2. `src/App.tsx` — `ChatWidgetsWrapper`
- Wykryć czy ścieżka to strona partnera (top-level `/:alias` — nie zaczyna się od `/admin`, `/dashboard`, `/login` itp.)
- Najprostsze podejście: sprawdzić czy pathname odpowiada wzorcowi strony partnera lub dodać listę znanych prefixów i ukrywać widget gdy żaden nie pasuje
- Bezpieczniejsze: dodać explicit check na znane ścieżki aplikacji i jeśli pathname nie pasuje do żadnej → uznać za stronę partnera i ukryć widget

### 3. `src/components/partner-page/sections/HeroSection.tsx`
- Dodać `onSurveyOpen?: () => void` do props
- W `renderSecondaryBtn`: jeśli `cta_secondary.url === '#ankieta'` i `onSurveyOpen` jest dostępne → `onClick` wywołuje `onSurveyOpen()` zamiast nawigacji
- Analogicznie dla primary CTA (`cta_primary`)

### 4. `src/pages/PartnerPage.tsx` i `src/pages/TemplatePreviewPage.tsx`
- Przekazać `onSurveyOpen` do `HeroSection` (tak jak już przekazywane do `HeaderSection` i `CtaBannerSection`)

## Pliki do zmiany
| Plik | Zmiana |
|------|--------|
| `SurveyModal.tsx` | Logo w lewym górnym rogu |
| `App.tsx` | Ukrycie MedicalChatWidget na stronach partnerów |
| `HeroSection.tsx` | Obsługa `#ankieta` w obu przyciskach CTA |
| `PartnerPage.tsx` | Przekazanie `onSurveyOpen` do HeroSection |
| `TemplatePreviewPage.tsx` | Przekazanie `onSurveyOpen` do HeroSection |

