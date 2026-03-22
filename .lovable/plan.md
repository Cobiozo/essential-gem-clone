

# Fix: Formularze nie działają na stronie partnera i w podglądzie szablonu

## Problem
`TemplatePreviewPage.tsx` (podgląd szablonu w panelu admina) renderuje sekcje `HeaderSection`, `HeroSection` i `CtaBannerSection` **bez** propsów `formKeys` i `onFormOpen`. W efekcie kliknięcie przycisku `#darmowy-poradnik` nie przechwytuje eventu i nie otwiera modala formularza.

Strona partnerska (`PartnerPage.tsx`) ma poprawną implementację — problem dotyczy podglądu w panelu admina.

## Rozwiązanie
Dodać do `TemplatePreviewPage.tsx`:
1. Fetch `partner_page_forms` (cta_key) przy ładowaniu
2. Stan `formKeys` i `activeFormKey`
3. Przekazanie `formKeys` i `onFormOpen` do `HeaderSection`, `HeroSection`, `CtaBannerSection`
4. Import i render `PartnerFormModal` (w trybie podglądu — bez zapisu leada, lub z fikcyjnym `partnerUserId`)

## Pliki do modyfikacji
- `src/pages/TemplatePreviewPage.tsx` — dodanie fetcha formularzy, stanu, propsów i modala

