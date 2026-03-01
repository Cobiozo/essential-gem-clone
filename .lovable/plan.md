
# Naprawa: Biała karta na produkcji (ReferenceError w useTranslations)

## Problem
Zmienna `isDev` jest zdefiniowana w linii 145, ale używana w funkcji `checkCacheVersion()` wywoływanej w linii 88 (przy ładowaniu modułu). `const` nie jest hoistowany - stąd `ReferenceError`.

Na preview działa, bo `try/catch` łapie błąd jako warning. Na produkcji z minifikacją bundler może zoptymalizować kod w sposób, który powoduje crash całego modułu i białą kartę.

## Rozwiązanie
Przenieść definicję `isDev` **przed** funkcję `checkCacheVersion()` - np. zaraz po linii 63 (po stałych cache).

### Zmiana w `src/hooks/useTranslations.ts`:
- Usunąć linię 145: `const isDev = process.env.NODE_ENV === 'development';`
- Dodać tę samą linię przed definicją `checkCacheVersion` (po linii 63, przed linią 72)

### Efekt:
- `isDev` będzie zainicjalizowana przed pierwszym użyciem
- Moduł tłumaczeń załaduje się poprawnie
- Strona startowa i logowanie będą działać na produkcji

## Dodatkowe
Po wdrożeniu konieczny będzie nowy build i deploy na Cyberfolks (PM2 restart).
