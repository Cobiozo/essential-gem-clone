

# Plan: Kolorowe koło umiejętności — każdy segment w innym kolorze

## Problem
Obecny wykres radarowy (Recharts `RadarChart`) rysuje jedną jednolitą powierzchnię. Na screenie referencyjnym każdy z 12 segmentów ma własny kolor i wypełnienie proporcjonalne do oceny — jak kolorowe koło.

## Podejście
Recharts `RadarChart` nie wspiera kolorowania per-segment. Trzeba zastąpić go **własnym komponentem SVG** rysującym koło polarne z 12 kolorowymi wycinkami (wedges).

## Zmiany

### `src/components/skills-assessment/SkillsRadarChart.tsx` — pełna wymiana
Zastąpić Recharts custom SVG:
- Rysować 12 wycinków kołowych (path z arc), każdy o kącie 30° (360/12)
- Promień każdego wycinka proporcjonalny do `score / 10 * maxRadius`
- Kolor każdego wycinka z `ASSESSMENT_STEPS[i].chartColor`
- Siatka koncentryczna (okręgi co 1-2 punkty) + linie radialne
- Etykiety na zewnątrz wycinków (pełne nazwy jak na screenie: "Jak dobrze znasz swoje „DLACZEGO"?", "Umiejętności rekrutacyjne", itd.)
- Tytuł "Twoje Koło Umiejętności" nad wykresem
- Skala liczbowa na osi pionowej (0-10)

### Kolory segmentów (z `assessmentData.ts` — już zdefiniowane)
1. why → czerwony, 2. recruiting → pomarańczowy, 3. compensation → żółty, 4. mindset → zielony, 5. leadership → teal, 6. finance → niebieski, 7. speaking → indigo, 8. health → fioletowy, 9. duplication → różowy, 10. giving → czerwono-różowy, 11. sales → ciemnopomarańczowy, 12. products → złoty

### Etykiety
Użyć pełnych tytułów z `ASSESSMENT_STEPS[i].title` (zawinięte w 2 linie jak na screenie), nie skróconych.

