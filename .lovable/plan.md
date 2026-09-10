# Stage 6 — finalizacja instrumentacji diagnostycznej

## Zakres

Zmiana wyłącznie `src/lib/stage6UpdateTracer.ts`, bez optymalizacji aplikacji, nowych flag ani pomiaru dashboardu.

## Implementacja

1. Dodać wspólną kontrolę czasu wywoływaną przy wejściu do wrapperów dispatch, commit i async. Po 180 sekundach zatrzyma ona zapis, odinstaluje wrappery async i ustawi publiczny stan tracera jako nieaktywny, bez własnego interwału.
2. Zawęzić `SECONDARY_RE` do jednoznacznych mechanizmów ref/Radix; `commitLayoutEffectOnFiber` przestanie automatycznie wykluczać dispatch z korelacji.
3. Ograniczyć przechwytywanie caller stacków do maksymalnie trzech unikalnych próbek na źródło. Po osiągnięciu limitu hot path nie utworzy kolejnego `Error().stack`; rekord zachowa licznik, czas, źródło, fazę i klasyfikację.

## Weryfikacja

- Typecheck przez `tsgo`.
- Production build.
- Kontrola diffu wyłącznie dla `src/lib/stage6UpdateTracer.ts`.
- Bez uruchamiania pomiaru `/dashboard`.
