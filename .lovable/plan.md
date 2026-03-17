

# Plan: Umieszczenie strony Skills Assessment w systemie HTML pages

## Sytuacja
Strona Skills Assessment jest interaktywnym komponentem React (slider, wykres radarowy, stan). System HTML pages renderuje statyczny HTML przez `dangerouslySetInnerHTML` — nie obsłuży interaktywności React.

## Podejście
Strona zostaje pod dedykowaną trasą `/skills-assessment`, ale integrujemy ją z systemem nawigacji w taki sam sposób jak strony HTML — pojawi się w sidebarze obok Regulaminu i Polityki Prywatności.

## Zmiany

### 1. `src/components/profile/ProfileCompletionGuard.tsx`
Dodać `'/skills-assessment'` do tablicy `KNOWN_APP_ROUTES` — zapobiegnie przechwyceniu przez mechanizm aliasów partnerów.

### 2. `src/components/dashboard/DashboardSidebar.tsx`
Dodać statyczny element menu `skills-assessment` z ikoną `Target` i ścieżką `/skills-assessment` — umieścić go w tym samym miejscu co dynamiczne HTML pages (tablica `dynamicHtmlPageItems` lub bezpośrednio obok niej w `menuItems`), tak by pojawiał się w sidebarze razem z Regulaminem i Polityką Prywatności.

### 3. Tłumaczenia (pliki PL/EN/DE)
Dodać klucz `dashboard.menu.skillsAssessment`:
- PL: "Ocena umiejętności"
- EN: "Skills Assessment"  
- DE: "Fähigkeitsbewertung"

Trzy pliki do zmiany, minimalna modyfikacja — strona będzie dostępna z sidebar obok stron HTML.

