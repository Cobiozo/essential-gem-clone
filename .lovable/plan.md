

# Redesign Dziennika Optymalizacji Omega — Health Tracking Dashboard

## Overview
Przebudowa strony `/moje-testy` na nowoczesny dashboard oparty o 6-miesięczny protokół suplementacji Omega-3 (cykl 120 dni krwinek czerwonych). Nowy layout z KPI kartami, osią czasu protokołu, i ulepszonym formularzem.

## Threshold Logic (kolory warunkowe)

Helper function `getThresholdColor()`:
- **Omega-6:3 Ratio**: Green ≤3.0 | Yellow 3.1-5.0 | Red >5.0
- **Omega-3 Index**: Green ≥8.0 | Yellow 4.0-7.9 | Red <4.0

## Zmiany w plikach

### 1. Nowy: `src/components/omega-tests/OmegaThresholds.ts`
- Export helper functions `getRatioColor(value)` i `getIndexColor(value)` zwracających klasy Tailwind (text-green-400, text-yellow-400, text-red-400)

### 2. Przebudowa: `VitalityProgress.tsx` → Oś Czasu Przebudowy Komórkowej
- Tytuł: "Oś Czasu Przebudowy Komórkowej"
- Zmiana etapów na protokół 6-miesięczny z dwoma kluczowymi kamieniami milowymi:
  - Miesiąc 0 (Test 1): "Punkt Wyjścia - Stan Zapalny"
  - Miesiąc 5 (Test 2): "Weryfikacja - Wymiana Krwinek (120+ dni)"
- Wizualny wskaźnik postępu użytkownika na osi czasu (horizontal stepped progress bar)

### 3. Przebudowa: `OmegaGaugeCharts.tsx` → KPI Cards
- Zamiana gauge SVG na dwie duże karty KPI:
  1. "Twój Balans Omega-6:3" — duża liczba z kolorowym formatowaniem (R/Y/G)
  2. "Twój Indeks Omega-3" — duża liczba + "%" z kolorowym formatowaniem
- Użycie threshold logic do dynamicznego koloru tekstu
- Pod wartościami: mała etykieta statusu (Optymalny/W poprawie/Krytyczny)

### 4. Przebudowa: `OmegaTestForm.tsx`
- Nowy tytuł: "Wprowadź Wyniki Testu Vitas"
- Dodanie Select input na etap protokołu: "Test 1 (Początek)" / "Test 2 (Miesiąc 5)" / "Kolejny test"
- Zachowanie Date picker, Number inputs (Ratio step 0.1, Index step 0.1), i pól AA/EPA/DHA/LA
- Przycisk: "ZAPISZ WYNIKI" (Primary)

### 5. Przebudowa: `OmegaTrendChart.tsx`
- Tytuł: "Historia Zmian (Test 1 vs Test 2)"
- Dual Y-Axis: lewy = Ratio (malejący trend = dobry), prawy = Index % (rosnący = dobry)
- X-Axis: daty testów

### 6. Aktualizacja: `OmegaTests.tsx` (layout)
- Nowy grid layout:
  - **Top full-width**: Oś Czasu Przebudowy Komórkowej
  - **Center (lg:col-span-8)**: KPI Cards (2 kolumny) + LineChart + SpectrumChart
  - **Right (lg:col-span-4)**: Formularz + Historia

### 7. `OmegaTestHistory.tsx` + `OmegaSpectrumChart.tsx`
- Dodanie threshold kolorów do historii (wartości kolorowane R/Y/G)
- SpectrumChart — bez zmian strukturalnych, drobne poprawki stylu

## Pliki do zmiany
| Plik | Akcja |
|------|-------|
| `src/components/omega-tests/OmegaThresholds.ts` | Nowy — helper functions |
| `src/components/omega-tests/VitalityProgress.tsx` | Przebudowa na oś czasu protokołu |
| `src/components/omega-tests/OmegaGaugeCharts.tsx` | Przebudowa na KPI cards |
| `src/components/omega-tests/OmegaTestForm.tsx` | Dodanie Select etapu, nowy tytuł |
| `src/components/omega-tests/OmegaTrendChart.tsx` | Dual Y-Axis, nowy tytuł |
| `src/components/omega-tests/OmegaTestHistory.tsx` | Threshold kolory |
| `src/pages/OmegaTests.tsx` | Nowy layout grid |

