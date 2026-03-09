

# Kompaktowy widok Auto-Webinar — 3 kolumny dni z godzinami

## Obecny problem

Widok pokazuje długą listę wszystkich godzin jednego dnia, co zajmuje dużo miejsca. Użytkownik chce kompaktowy layout z 3 kolumnami (dziś + 2 kolejne dni), gdzie godziny wyświetlają się pod każdym dniem, a po kliknięciu godziny pojawia się przycisk kopiowania zaproszenia.

## Nowy layout

```text
┌─────────────────────────────────────────────────────┐
│  [Grafika]  Szansa Biznesowa       Webinar · Co 30m │
│             Podejmij świadomą...                     │
├─────────────────────────────────────────────────────┤
│  Pon, 9 marca    │  Wt, 10 marca   │  Śr, 11 marca │
│  ──────────────  │  ──────────────  │  ────────────  │
│  08:00 zakończ.  │  08:00          │  08:00         │
│  08:30 zakończ.  │  08:30          │  08:30         │
│  ...             │  ...            │  ...           │
│  ● 12:00 TRWA   │  12:00          │  12:00         │
│  12:30           │  12:30          │  12:30         │
│  ...             │  ...            │  ...           │
└─────────────────────────────────────────────────────┘

Po kliknięciu godziny → podświetlenie + przycisk:
  [📋 Kopiuj zaproszenie na wt, 10 marca 08:30]
```

## Zmiany

| Element | Szczegóły |
|---------|-----------|
| **Header** | Kompaktowy — grafika mniejsza (thumbnail obok tytułu) zamiast pełnego baneru aspect-video |
| **3 kolumny dni** | `grid grid-cols-3`. Dziś + jutro + pojutrze. Nagłówek: skrócona nazwa dnia + data |
| **Godziny w kolumnach** | Kompaktowe wiersze. Dla dzisiejszego dnia: przeszłe wyszarzone, bieżąca podświetlona. Dla przyszłych dni: wszystkie aktywne |
| **Selekcja godziny** | Stan `selectedSlot: {date, time}`. Kliknięcie godziny podświetla ją. Pod siatką pojawia się przycisk "Kopiuj zaproszenie" z datą i godziną |
| **Kopiowanie** | Tekst zaproszenia zawiera wybraną datę (nie tylko dziś) i godzinę |

## Plik do edycji

`src/components/auto-webinar/AutoWebinarEventView.tsx` — pełna przebudowa komponentu

