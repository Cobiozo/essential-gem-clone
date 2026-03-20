

# Ankieta jako modal (popup) zamiast sekcji na stronie

## Zmiana koncepcji
Ankieta nie będzie widoczną sekcją na landing page partnera. Zamiast tego otworzy się jako pełnoekranowy modal po kliknięciu przycisku CTA.

## Zmiany

### 1. Nowy komponent `SurveyModal.tsx`
Utworzyć `src/components/partner-page/sections/SurveyModal.tsx`:
- Pełnoekranowy overlay (fixed, z-50, ciemne tło z blur)
- Wewnątrz renderuje istniejący `SurveySection` z przekazanym `config`
- Przycisk zamknięcia (X) w prawym górnym rogu
- Props: `config`, `open`, `onClose`

### 2. Zmiana renderowania w `PartnerPage.tsx`
- Sekcja `survey` **nie będzie** renderowana inline na stronie
- Zamiast tego: dodać state `surveyOpen` + zapisać `surveyConfig` z elementu typu `survey`
- Renderować `<SurveyModal>` na końcu strony (poza mapą sekcji)
- W `case 'survey':` → `sectionNode = null` (nie renderować inline), ale zachować config

### 3. Zmiana CTA w `CtaBannerSection.tsx`
- Dodać opcjonalny callback `onSurveyOpen?: () => void`
- Gdy `cta_url === '#ankieta'` (lub ogólnie wskazuje na survey), zamiast scrollować → wywołać `onSurveyOpen()`
- Przekazać callback z `PartnerPage.tsx`

### 4. Analogiczna zmiana w `TemplatePreviewPage.tsx`
- Ta sama logika: survey jako modal, nie inline sekcja

### 5. `HeaderSection.tsx`
- Jeśli nawigacja zawiera link `#ankieta`, też powinna otwierać modal zamiast scrollować

## Schemat przepływu

```text
[CTA "Wypełnij ankietę"] → onClick → setSurveyOpen(true)
                                          ↓
                              ┌─────────────────────────┐
                              │   SurveyModal (overlay)  │
                              │  ┌───────────────────┐  │
                              │  │   SurveySection    │  │
                              │  │  (pytania, wyniki) │  │
                              │  └───────────────────┘  │
                              │          [X zamknij]     │
                              └─────────────────────────┘
```

## Pliki do zmiany/utworzenia
| Plik | Akcja |
|------|-------|
| `src/components/partner-page/sections/SurveyModal.tsx` | Nowy — modal wrapper |
| `src/pages/PartnerPage.tsx` | Zmiana — survey jako modal, nie sekcja |
| `src/components/partner-page/sections/CtaBannerSection.tsx` | Zmiana — callback zamiast scroll |
| `src/pages/TemplatePreviewPage.tsx` | Zmiana — analogicznie |
| `src/components/partner-page/sections/HeaderSection.tsx` | Zmiana — link #ankieta otwiera modal |
| `src/components/partner-page/sections/index.ts` | Export SurveyModal |

