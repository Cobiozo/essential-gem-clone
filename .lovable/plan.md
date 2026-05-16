## Cel
Klastrowanie punktów na mapie świata + większy zoom z możliwością rozdzielenia miast w obrębie jednego klastra.

## 1) Głębszy zoom (`UserWorldMap.tsx`)
- `maxZoom`: 8 → **64** (na `<ZoomableGroup>` i w `handleZoomIn`).
- Krok zoomu: 1.5× → **1.8×** (szybsze dochodzenie do poziomu miasta).
- Promień markera skalowany przez `1 / Math.sqrt(zoom)` zamiast `1 / zoom`, żeby przy dużym przybliżeniu markery nie znikały całkowicie, ale też nie zasłaniały dzielnic.

## 2) Klastrowanie zależne od zoomu
Algorytm grid-based (prosty, bez dodatkowej biblioteki — całość client-side):

```
cellSize = baseCell / zoom        // baseCell ~ 8 stopni przy zoom=1
key = `${floor(lng/cellSize)}|${floor(lat/cellSize)}`
```

Dla każdej komórki agregujemy punkty:
- `count = sum(p.count)` (suma użytkowników)
- `cities = p.city[]` (lista miast w klastrze)
- `lat/lng = średnia ważona po count`

Render:
- **Klaster (≥2 miasta)**: większe koło z liczbą w środku (`text` SVG), kolor `--primary`, obrys biały. Tooltip: lista miast (max 8 + „…i N więcej") + łączna liczba użytkowników. Klik = zoom in 2× i wycentrowanie na klastrze.
- **Pojedynczy punkt**: dotychczasowy marker z dotychczasowym tooltipem.

Przy `zoom ≥ ~12` (poziom miasta) `cellSize` staje się bardzo mały i każdy punkt jest praktycznie osobny — naturalne „declustering" wraz z przybliżeniem.

## 3) UX
- Kursor `pointer` na klastrach.
- Animowane przejście zoomu nie jest potrzebne (`react-simple-maps` aktualizuje stan instant — ok).
- Legenda zostaje (1 / średnia / max użytkowników); pod nią dodać małą podpowiedź: „Kliknij klaster, aby przybliżyć".

## Pliki
- `src/components/admin/UserWorldMap.tsx` — jedyna modyfikacja. Bez zmian w bazie/edge functions.

## Bez zmian
- Tooltip pojedynczego markera (miasto, kraj, liczba użytkowników) zostaje 1:1.
- Logika geokodowania, fallback krajów, pasek statusu — bez zmian.
