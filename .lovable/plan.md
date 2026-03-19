

# Plan: Podgląd szablonu jako rzeczywista strona

## Problem
Przycisk "Podgląd" w edytorze szablonów CMS pokazuje uproszczony widok bloków (Badge + placeholder), zamiast renderować prawdziwą stronę partnera z użyciem sekcji (HeroSection, ProductsGridSection itd.).

## Rozwiązanie
Utworzyć nową stronę `/admin/template-preview/:templateId`, która renderuje szablon identycznie jak `PartnerPage.tsx`, ale zasilana bezpośrednio danymi szablonu (bez potrzeby aliasu partnera). Przycisk "Podgląd" otworzy tę stronę w nowej karcie.

## Zmiany

### 1. Nowa strona `src/pages/TemplatePreviewPage.tsx`
- Pobiera szablon z `partner_page_template` po `templateId` z URL
- Pobiera produkty z `product_catalog`
- Renderuje te same sekcje co `PartnerPage.tsx` (HeroSection, HeaderSection, itd.) używając `config` z szablonu jako danych
- Bez trybu edycji — czysto wizualny podgląd
- Nagłówek z przyciskiem "Powrót do edytora"

### 2. Rejestracja trasy w `App.tsx`
- Dodać chronioną trasę `/admin/template-preview/:templateId`

### 3. Zmiana w `PartnerTemplateEditor.tsx`
- Przycisk "Podgląd" zamiast przełączać `previewMode` — otwiera `/admin/template-preview/{templateId}` w nowej karcie (`window.open`)
- Usunąć stary uproszczony podgląd (blok `previewMode ? ...`)

### 4. Dodanie trasy do `KNOWN_APP_ROUTES` w `ProfileCompletionGuard.tsx`
- Aby ścieżka nie była przechwycona przez catch-all aliasu partnera

## Pliki

| Plik | Zmiana |
|------|--------|
| `src/pages/TemplatePreviewPage.tsx` | Nowa strona — renderuje szablon jak prawdziwa strona partnera |
| `src/App.tsx` | Dodać trasę `/admin/template-preview/:templateId` |
| `src/components/admin/PartnerTemplateEditor.tsx` | Zmienić "Podgląd" na `window.open` do nowej trasy |
| `src/components/ProfileCompletionGuard.tsx` | Dodać trasę do `KNOWN_APP_ROUTES` |

