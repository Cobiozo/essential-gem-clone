

# Plan: Czytelne podsumowanie PNG + grafika kołowa w emailu

## Problemy
1. **PNG nieczytelny** — `truncate` ucina tekst, `hsl(var(--foreground))` w dark mode daje ciemny tekst na białym tle (`backgroundColor: '#ffffff'`), etykiety SVG też używają CSS variables niewidocznych po eksporcie
2. **Email bez grafiki kołowej** — wysyłany jest tylko tekst HTML, brak obrazu koła

## Zmiany

### 1. `AssessmentSummary.tsx` — poprawka eksportu PNG

- Usunąć `truncate` ze span-ów w siatce wyników i sekcjach top3/bottom3 (tekst się obcina)
- W `handleDownload` przed wywołaniem `html2canvas`: tymczasowo nadać kontenerowi explicit kolory inline (ciemne tło `#1a1a2e`, jasny tekst `#ffffff`) zamiast polegać na CSS variables, które `html2canvas` nie rozwiązuje poprawnie. Po zrobieniu screenshota — przywrócić oryginalne style.
- Alternatywnie: stworzyć dedykowany ukryty div z hardcoded kolorami (dark background, white text) do eksportu — lepsze rozwiązanie, bo nie powoduje migania UI.

### 2. `SkillsRadarChart.tsx` — hardcoded kolory dla eksportu

- SVG labels i grid używają `hsl(var(--foreground))` i `hsl(var(--border))` — `html2canvas` ich nie rozwiązuje.
- Dodać prop `exportMode?: boolean` do `SkillsRadarChart`. Gdy `true`, zamienić CSS variables na hardcoded hex:
  - `--foreground` → `#ffffff`
  - `--border` → `#555555`
  - `--muted-foreground` → `#999999`
- W eksportowym kontenerze renderować `<SkillsRadarChart scores={scores} exportMode />`.

### 3. `AssessmentSummary.tsx` — grafika kołowa w emailu

- W `handleSendEmail`: użyć `html2canvas` na kontenerze z wykresem (lub dedykowanym export divie) aby wygenerować PNG jako base64 data URL.
- Osadzić obraz w emailu jako `<img src="data:image/png;base64,..." />` w treści `htmlBody` — inline base64 images działają w większości klientów email.
- Dodać wykres przed tabelą wyników w treści emaila.

### 4. Usunięcie `truncate` z tekstu

W scores grid i sekcjach mocne strony / do rozwoju usunąć `truncate` class, aby pełne nazwy umiejętności były widoczne zarówno na ekranie jak i w PNG.

## Pliki do zmiany
1. `src/components/skills-assessment/SkillsRadarChart.tsx` — prop `exportMode`
2. `src/components/skills-assessment/AssessmentSummary.tsx` — ukryty export div z hardcoded kolorami, email z base64 obrazem, usunięcie `truncate`

