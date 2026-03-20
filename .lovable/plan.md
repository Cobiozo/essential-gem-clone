

# Fix: Przycisk CTA nie otwiera ankiety

## Problem
Przycisk "PRZEJDŹ DO ANKIETY" w sekcji CTA nie przewija do ankiety, ponieważ:
1. Sekcja `survey` prawdopodobnie nie istnieje jeszcze w `template_data` szablonu (została dodana tylko w SurveyManager jako fallback, ale nie została zapisana)
2. Nawet jeśli `cta_url` wskazuje na `#ankieta`, element z `id="ankieta"` nie jest renderowany

## Rozwiązanie

### 1. Dodać smooth scroll do linków z hash w CtaBannerSection
Zamiast domyślnego zachowania `<a href="#ankieta">` (które powoduje "jump" lub nie działa w SPA), dodać obsługę smooth scroll z offsetem dla sticky headera.

**Plik**: `src/components/partner-page/sections/CtaBannerSection.tsx`
- Dodać `onClick` handler na linku CTA
- Jeśli `cta_url` zaczyna się od `#`, wywołać `document.getElementById()` + `scrollIntoView({ behavior: 'smooth' })`
- Zapobiec domyślnemu zachowaniu linku (`e.preventDefault()`)

### 2. Automatycznie dodać sekcję survey do szablonu przy pierwszym zapisie
Upewnić się, że `SurveyManager.handleSave()` poprawnie dodaje sekcję `survey` do `template_data` (ten kod już istnieje — linia 55-63). Użytkownik musi kliknąć "Zapisz" w zakładce Ankieta.

### 3. Dodać informację gdy sekcja survey nie istnieje w szablonie
W `SurveyManager` dodać komunikat informujący, że po zapisaniu ankieta zostanie dodana do szablonu i będzie widoczna na stronach partnerów.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/partner-page/sections/CtaBannerSection.tsx` | Smooth scroll dla hash linków |
| `src/components/admin/SurveyManager.tsx` | Info o konieczności zapisu + lepszy UX |

