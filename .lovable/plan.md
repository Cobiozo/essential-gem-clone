# Profesjonalna mapa — precyzja, cienkie kontury, adaptacyjne markery

Zmiany wyłącznie w `src/components/admin/UserWorldMap.tsx` (frontend).

## 1) Dokładniejsza geometria świata
- Zamienić źródło: `world-atlas/countries-110m.json` → `world-atlas/countries-50m.json` (~5× więcej szczegółów wybrzeży i granic, bez zauważalnego kosztu wydajności dla ~250 krajów).
- Domyślny `projectionConfig.scale` bez zmian (160).

## 2) Cienkie kontury państw (skalowane do zoomu)
- Granice mają zachować stałą wizualną grubość niezależnie od poziomu zoomu — w SVG `strokeWidth` w `ZoomableGroup` jest mnożony przez zoom, więc dzielimy przez `position.zoom`:
  - normalna: `strokeWidth = 0.4 / zoom`
  - wybrana (highlight): `strokeWidth = 0.7 / zoom` (cienka, ale wyróżniona kolorem)
- Stroke kolor: `hsl(var(--border) / 0.7)` (subtelniejszy niż obecnie), wybrany kraj `hsl(var(--primary))`.
- Dodać `vectorEffect: 'non-scaling-stroke'` jako bezpiecznik (gdy obsługiwane przeglądarka rysuje stałą grubość 1 piksela CSS — wtedy używamy małych wartości jako mnożnika).
- Wypełnienia bez zmian (subtelne `--muted`).
- `strokeLinejoin: 'round'`, `shapeRendering: 'geometricPrecision'` dla gładkich krzywych.

## 3) Markery — adaptacyjny rozmiar i gęstość do zoomu
- **Klastrowanie** — siatka mniejsza wraz ze zoomem (więcej widocznych klastrów / pojedynczych miast):
  - `cellSize = 6 / Math.pow(zoom, 1.15)` (obecnie `8/zoom`); efekt: przy zoom 1 ≈ 6°, przy zoom 8 ≈ ~0.55°, przy zoom 32 ≈ ~0.09° — pozwala rozróżnić pojedyncze ulice w mieście.
- **Promień markerów** — log od liczby userów, lekkie zmniejszanie przy zoomie (ale nie znikają):
  - `r = clamp(0.8, 4.5, (1.4 + Math.log2(count + 1) * 0.85) / Math.pow(zoom, 0.55))`
  - Dzięki wykładnikowi 0.55 (zamiast 0.5) markery przy dużym zoomie są mniejsze ale wyraźne; przy małym zoomie nie są zbyt duże.
- **Obrys markera** — cienki, skalowany: `strokeWidth = 0.5 / Math.pow(zoom, 0.55)`, `stroke="hsl(var(--background))"` zamiast czystej bieli (lepiej w dark mode).
- **Pojedyncze miasto vs klaster** — różnica tylko w `fillOpacity` (1.0 vs 0.85), bez liczb.
- **Hit area** — niewidoczne kółko `r * 2.5` z `fillOpacity={0}` pod właściwym markerem, żeby łatwiej trafić kursorem przy małych rozmiarach.

## 4) Auto-dopasowanie po wyborze kraju
- W `handleGeographyClick` pozostawić animowane przejście, ale poprawić zoom:
  - `zoom = clamp(2.5, 24, 70 / spread)` (większy max, by zobaczyć rozłożenie po miastach).

## 5) Legenda
- Zaktualizować formułę promienia do nowej (`r = 1.4 + log2(n+1) * 0.85`, clamp jak wyżej, bez dzielenia przez zoom).
- Stroke `hsl(var(--background))` zamiast `white`.

## Bez zmian
- Hook geokodowania, edge function, RLS, dane.
- Animacja kamery (`animateTo`), zoom kontrolki, tooltip, filtr po kraju.

## Pliki
- `src/components/admin/UserWorldMap.tsx` — jedyna modyfikacja.
