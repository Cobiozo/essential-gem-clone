

# Poprawka wyrównania tekstu w podglądzie mapowania

## Problem
Elementy mapowania z `textAlign: center` (lub `right`) nie są prawidłowo wyrównywane w podglądzie. Na screenshocie widać, że tekst nachodzi na siebie i nie jest wyśrodkowany tak jak ustawił admin w edytorze.

## Przyczyna
W `PreviewWithMappings` (linia 128) szerokość elementu jest ustawiana jako `widthPct ? ... : 'auto'`. Gdy `width` nie jest zapisany lub wynosi 0, element dostaje `width: auto`, co sprawia że `text-align: center` nie działa (div zwija się do szerokości tekstu). Dodatkowo brak `overflow: hidden` i `wordBreak` może powodować wychodzenie tekstu poza ramki.

## Rozwiązanie w `BpPageFilesManager.tsx`

### Zmiana w `PreviewWithMappings` (linie ~115-140)
1. **Zawsze ustawiaj width** — jeśli `el.width` nie jest zapisany, użyj domyślnej wartości 300px (tak samo jak edytor Fabric.js w linii 251: `width: el.width || 300`)
2. **Popraw style elementu**:
   - `width` zawsze wyrażone jako procent stage (nigdy `auto`)
   - `textAlign` z danych mapowania (center/left/right) — zawsze respektowany
   - Dodaj `overflow: hidden` i `wordBreak: 'break-word'` aby tekst nie wychodził poza ramkę

### Konkretna zmiana
```typescript
// Zamiast:
const widthPct = el.width ? (el.width / CANVAS_WIDTH) * 100 : undefined;
// ...
width: widthPct ? `${widthPct}%` : 'auto',

// Na:
const elWidth = el.width || 300;
const widthPct = (elWidth / CANVAS_WIDTH) * 100;
// ...
width: `${widthPct}%`,
overflow: 'hidden',
wordBreak: 'break-word',
```

## Plik do zmiany
- `src/components/admin/BpPageFilesManager.tsx` — sekcja `PreviewWithMappings`, linie 115-140

