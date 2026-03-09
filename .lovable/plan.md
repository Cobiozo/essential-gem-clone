

# Fix: Wszystkie sloty powinny być klikalne do kopiowania zaproszeń

## Problem

Po upływie 2 minut od rozpoczęcia slotu (np. 22:02), slot 22:00 staje się bezużyteczny dla zaproszenia — nikt już nie dołączy (reguła 2 minut). Ale system nadal oznacza go jako "LIVE" zamiast pozwolić na przejście do następnego.

Dodatkowo, przeszłe sloty dzisiejszego dnia nie powinny być wyłączone, bo partner może chcieć skopiować zaproszenie na tę samą godzinę **na jutro lub pojutrze** (klikając odpowiednią kolumnę).

## Rozwiązanie

1. **Żaden slot nie będzie disabled** — usunięcie `disabled={isPast}`. Cel widoku to kopiowanie zaproszeń, nie dołączanie do pokoju. Każdy slot w każdej z 3 kolumn jest klikalny.

2. **Slot LIVE po 2 minutach** → wizualnie zmiana na "przeszły" (wyszarzony), bo nikt już nie dołączy. Następny slot staje się podświetlony jako najbliższy.

3. **Przeszłe sloty dzisiaj** → wyszarzone ale nadal klikalne (bez `disabled`, bez `cursor-not-allowed`). Partner może je wybrać i skopiować zaproszenie.

## Zmiana w pliku

`src/components/auto-webinar/AutoWebinarEventView.tsx`:

- `getSlotStatus`: slot 'now' po 2 minutach → traktuj jako 'past' 
- Usunięcie `disabled={isPast}` z `<button>`
- Przeszłe sloty: wyszarzone ale klikalne (zmiana stylu z `cursor-not-allowed` na `opacity-50`)

