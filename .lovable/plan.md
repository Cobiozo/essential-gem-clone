

# Fix: Ankieta — brak kotwicy w edytorze + wolne ładowanie szablonu

## Zidentyfikowane problemy

### 1. Brak pola "Anchor ID" w edytorze ankiety
`SurveySectionEditor.tsx` nie ma pola do ustawienia `anchor_id`. Domyślna konfiguracja zawiera `anchor_id: 'ankieta'` (linia 145 w `defaultSectionConfigs.ts`), ale admin nie ma jak tego zobaczyć ani edytować.

### 2. `survey` brakuje w tablicy `RICH_TYPES`
W `PartnerPage.tsx` linia 167 — tablica `RICH_TYPES` nie zawiera `'survey'`. To powoduje, że system nie rozpoznaje szablonu zawierającego ankietę jako "rich" i może przełączać się na legacy rendering.

### 3. Wolne ładowanie szablonu
Strona `TemplatePreviewPage.tsx` importuje wszystkie sekcje synchronicznie. Ewentualnie problem z wieloma renderami — do dalszej analizy, ale dodanie `survey` do `RICH_TYPES` może rozwiązać część problemu z renderowaniem.

## Zmiany

### Plik 1: `src/components/admin/template-sections/SurveySectionEditor.tsx`
- Dodać pole **"Anchor ID (kotwica)"** w sekcji ustawień globalnych, np. po podtytule
- Input z placeholderem `ankieta` i podpowiedzią: "Wpisz ID, np. 'ankieta' — użyj w CTA jako #ankieta"
- Wartość: `config.anchor_id`

### Plik 2: `src/pages/PartnerPage.tsx`
- Linia 167: dodać `'survey'` do tablicy `RICH_TYPES`

## Efekt
- Admin może ustawić/zobaczyć anchor ID ankiety (domyślnie `ankieta`)
- Przycisk CTA z `#ankieta` będzie płynnie przewijał do sekcji survey
- Szablon z ankietą będzie poprawnie renderowany w trybie "rich"

