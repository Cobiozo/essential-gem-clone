

# Plan: Poprawki koła umiejętności, emaila i pobierania

## 3 problemy do naprawienia

### 1. Siatka co 1 punkt (zamiast co 2)
**Plik:** `src/components/skills-assessment/SkillsRadarChart.tsx`
- Zmienić `GRID_STEPS` z `[2, 4, 6, 8, 10]` na `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`
- Wszystkie 12 segmentów już renderuje się jednocześnie — kolory pojawiają się "kolejno" wizualnie bo siatka ma za duże skoki. Po zmianie na co 1 punkt, koło będzie pełniejsze i bardziej czytelne.

### 2. Wysyłka emaila przez edge function (nie mailto:)
**Plik:** `src/components/skills-assessment/AssessmentSummary.tsx`
- Zamienić `mailto:` na wywołanie `supabase.functions.invoke('send-single-email')` — edge function już istnieje i obsługuje SMTP.
- Przygotować body z wynikami (tekstowy listing 12 umiejętności + średnia + suma) i wysłać na podany adres.
- Zmienić toast na: `title: 'Wysłano!'`, `description: 'Wyniki zostały wysłane na adres {email}'`.
- Dodać obsługę stanu `sending` (loading) i błędów.

### 3. Pobieranie PNG z podsumowaniem
**Plik:** `src/components/skills-assessment/AssessmentSummary.tsx`
- Rozszerzyć `ref={chartRef}` na większy kontener zawierający zarówno wykres, jak i podsumowanie tekstowe (średnia, suma, top 3 mocne strony, top 3 do rozwoju).
- Stworzyć dedykowany div do eksportu (może być ukryty lub widoczny), który zawiera:
  - Tytuł "Ocena Umiejętności w Network Marketingu"
  - Koło umiejętności (SkillsRadarChart)
  - Listę wyników (12 pozycji z ocenami)
  - Średnią i sumę punktów
  - Mocne strony i obszary do rozwoju
- `html2canvas` zrobi screenshot tego pełnego kontenera.

## Pliki do zmiany
1. `src/components/skills-assessment/SkillsRadarChart.tsx` — GRID_STEPS co 1
2. `src/components/skills-assessment/AssessmentSummary.tsx` — email via edge function, rozszerzony PNG export, poprawiony toast

