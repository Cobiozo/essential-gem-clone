
Naprawiam to konkretnie pod Twój przypadek (`dd.mm.rrrr` + klikalna ikonka jest, ale jej nie widać).

## Diagnoza (dlaczego poprzednia poprawka nie zadziałała)
1. Styl złotej ikonki został dodany do `src/App.css`, ale ten plik nie jest nigdzie importowany (`main.tsx` ładuje tylko `index.css`).
2. W `src/index.css` już istnieje reguła dla dark mode:
   - `.dark input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); }`
   która i tak nadpisuje kolor na biały/ciemny wariant, zamiast złotego.

## Plan wdrożenia
1. Przenieść/ustawić docelowe style ikonki daty w `src/index.css` (jedyne miejsce globalnych stylów).
2. Zastąpić istniejącą regułę dark-mode dla date/time tak, aby dla `input[type="date"]` wymuszała:
   - `opacity: 1`
   - złoty filtr `filter: ... !important`
   - `cursor: pointer`
3. Dodać poprawkę widoczności i klikalności:
   - `padding-right` dla `input[type="date"]`, żeby ikonka miała miejsce i nie zlewała się z tekstem daty.
4. Usunąć martwy kod z `App.css` (lub zostawić, ale rekomendowane usunięcie, żeby nie mylił w przyszłości).

## Techniczne szczegóły (co dokładnie zmienię)
Plik: `src/index.css`  
Sekcja: globalne utility/base dla date inputów

- Zmiana istniejącej reguły:
```css
.dark input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
}
```
na docelową złotą z wymuszeniem widoczności:
```css
.dark input[type="date"]::-webkit-calendar-picker-indicator,
input[type="date"]::-webkit-calendar-picker-indicator {
  opacity: 1;
  filter: brightness(0) saturate(100%) invert(74%) sepia(43%) saturate(884%) hue-rotate(8deg) brightness(95%) contrast(89%) !important;
  cursor: pointer;
}
```

- Dodatkowo:
```css
input[type="date"] {
  padding-right: 2.5rem;
}
```

## Kryteria akceptacji
1. W formularzu „Dodaj kontakt prywatny” przy polach daty ikonka jest wyraźnie widoczna (złota), nie „zniknięta”.
2. Ikonka pozostaje klikalna i otwiera natywny selektor daty.
3. Działa na wszystkich polach typu date w aplikacji (globalnie), zgodnie z Twoim wymaganiem „wszędzie”.
