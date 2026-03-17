

# Plan: Interaktywna strona "Ocena Umiejętności w Network Marketingu" (12 kroków + podsumowanie)

## Opis
Strona wewnętrzna z 12-krokowym quizem samooceny. Każdy krok ma slider 1-10, opisy zakresów ocen i wykres radarowy (koło umiejętności) aktualizowany na żywo. Na końcu — podsumowanie z możliwością pobrania diagramu jako PNG lub wysłania na email via SMTP.

## Struktura plików

### Nowe pliki
1. **`src/pages/SkillsAssessment.tsx`** — strona-kontener z routingiem, stanem 12 ocen, nawigacją kroków
2. **`src/components/skills-assessment/AssessmentStep.tsx`** — pojedynczy krok: tytuł, opis, slider 1-10, opisy zakresów (1-3, 4-6, 7-9, 10), podświetlenie aktywnego zakresu
3. **`src/components/skills-assessment/SkillsRadarChart.tsx`** — wykres radarowy (Recharts `RadarChart` + `PolarGrid` + `PolarAngleAxis`) z 12 segmentami, kolorowe wypełnienie, aktualizacja na żywo
4. **`src/components/skills-assessment/AssessmentSummary.tsx`** — ekran podsumowania: tekst gratulacyjny, przycisk "Pobierz diagram (PNG)" via `html2canvas`, formularz email + przycisk "Wyślij wyniki na e-mail" (invoke `send-single-email` lub dedykowany edge function), przycisk "Wypełnij test ponownie"

### Modyfikacje
5. **`src/App.tsx`** — dodanie trasy `/skills-assessment`

## Dane 12 kroków (z screenów)

| # | Klucz | Tytuł | Opis |
|---|-------|-------|------|
| 1 | why | Jak dobrze znasz swoje "DLACZEGO"? | Twoje "dlaczego" to fundament motywacji... |
| 2 | recruiting | Umiejętności rekrutacyjne | Rekrutacja to umiejętność zapraszania... |
| 3 | compensation | Znajomość planu wynagrodzeń | Plan wynagrodzeń to mapa... |
| 4 | mindset | Nastawienie "Brak problemów" | Mentalność "brak problemów" to klucz... |
| 5 | leadership | Umiejętności przywódcze | Lider w NM inspiruje, wspiera... |
| 6 | finance | Finanse / Bogactwo | Wolność finansowa to cel... |
| 7 | speaking | Przemawianie i Komunikacja | Komunikacja to fundament relacji... |
| 8 | health | Zdrowie i Kondycja | Energia i zdrowie to paliwo... |
| 9 | duplication | Skuteczność duplikacji | Duplikacja to serce NM... |
| 10 | giving | Dawanie od siebie | Dawanie od siebie buduje zaufanie... |
| 11 | sales | Umiejętności sprzedażowe i zbijanie obiekcji | Skuteczna sprzedaż to fundament... |
| 12 | products | Znajomość produktów (Eqology) | Zaufanie klientów buduje się na wiedzy... |

Każdy krok zawiera 4 zakresy opisów (1-3, 4-6, 7-9, 10) — treść ze screenów.

## UI Layout (każdy krok)
- Header: tytuł strony, "Krok X z 12", pasek postępu
- Lewa kolumna: badge "Sekcja X/12", tytuł, opis, slider 1-10 z liczbami, sekcja "CO OZNACZAJĄ OCENY?" z 4 kartami (aktywna podświetlona kolorem)
- Prawa kolumna: "Podgląd na żywo" — wykres radarowy
- Dół: przyciski "Wstecz" / "Dalej" (ostatni krok: "Zakończ i podsumuj")

## Wykres radarowy
- Recharts `RadarChart` z `PolarGrid`, `PolarAngleAxis`, `Radar` (wypełniony, kolorowy)
- 12 osi odpowiadających krokom
- Każdy segment w innym kolorze (jak na screenach — tęczowa paleta)
- Skala 0-10, siatka co 1 punkt

## Podsumowanie
- Lewa: "Twój spersonalizowany wykres jest gotowy!", opis, sekcja "Zapisz swoje wyniki":
  - Przycisk "Pobierz diagram (PNG)" — `html2canvas` na element wykresu → download
  - Separator "LUB WYŚLIJ NA MAIL"
  - Input email + przycisk "Wyślij wyniki na e-mail" — otwiera klienta poczty (`mailto:`) z gotową treścią LUB invoke edge function
  - Przycisk "Wypełnij test ponownie" — reset stanów
- Prawa: finalne koło z etykietami nazw wszystkich 12 umiejętności

## Wysyłka email
Użycie `mailto:` link z zakodowaną treścią (wyniki tekstowe) — proste, nie wymaga backendu. Opcjonalnie: przycisk "Wyślij wyniki na e-mail" może wywołać istniejący edge function `send-single-email` do wysłania HTML z wynikami via SMTP.

## Technologie
- `recharts` (już zainstalowany) — RadarChart
- `html2canvas` (już zainstalowany) — eksport PNG
- Slider z `@radix-ui/react-slider` (już w projekcie)
- Stan lokalny React (useState) — bez bazy danych

