

# Audyt i optymalizacja VideoBackgroundProcessor

## Zidentyfikowane problemy

### 1. Zbyt agresywny kontrast maski (linia 482)
`contrastMask(mask, 8)` przy full-res modelu za mocno "twardnieje" granice maski zanim jeszcze zostaną wygładzone. Naturalne gradienty z wysokorozdzielczego modelu selfie_segmenter są tracone na starcie pipeline'u.

### 2. Za wąskie pasmo przejściowe smoothstep (linie 578-579)
`edgeLow=0.35, edgeHigh=0.55` daje pasmo przejściowe o szerokości zaledwie 0.20. To powoduje widoczną, ostrą granicę między osobą a tłem (widoczne na screenshocie - krawędzie ramion i głowy).

### 3. Za mały blur przestrzenny maski (linia 513)
`blurPx=2` dla full-res modelu jest niewystarczający do naturalnego featheringu krawędzi. Przy rozdzielczości 640px, 2px to minimalna ilość wygładzenia.

### 4. Tło rysowane od nowa w każdej klatce (linie 724-734)
`applyImageBackground` rysuje obraz tła na canvas, a potem robi `getImageData` **w każdej klatce**, mimo że tło się nie zmienia. To niepotrzebne obciążenie CPU/GPU.

### 5. Rozdzielczość przetwarzania (640px) przy 1 uczestniku
Gdy użytkownik jest sam w pokoju, `setParticipantCount(1)` ustawia 800px jako base, ale `IMAGE_MODE_OVERRIDES.minProcessWidth=640` i tak ogranicza do 640. System mógłby korzystać z wyższej rozdzielczości.

### 6. Brak "person-priority" blendingu w strefie przejścia
W strefie granicznej (linie 752-759) blend jest liniowy. Przy wirtualnym tle krawędzie sylwetki powinny faworyzować piksele osoby (bias), aby uniknąć "prześwitu" tła przez ciało.

---

## Plan zmian (plik: `VideoBackgroundProcessor.ts`)

### Zmiana 1: Łagodniejszy kontrast wstępny
Zmniejszenie siły z `8` na `4` dla full-res modelu w trybie image. Zachowa więcej naturalnych gradientów z maski ML.

### Zmiana 2: Szersze pasmo smoothstep
Rozszerzenie z `(0.35, 0.55)` na `(0.25, 0.65)` - pasmo przejściowe 0.40 zamiast 0.20. Da miększe, bardziej naturalne krawędzie.

### Zmiana 3: Większy blur przestrzenny maski
Zwiększenie z `2px` na `4px` dla full-res modelu w trybie image. Lepsze featherowanie krawędzi.

### Zmiana 4: Cache tła statycznego
Rysowanie obrazu tła na canvas i pobieranie `ImageData` tylko raz (przy pierwszym użyciu lub zmianie rozmiaru), zamiast w każdej klatce.

### Zmiana 5: Wyższa rozdzielczość przy 1 uczestniku
Podniesienie `IMAGE_MODE_OVERRIDES.minProcessWidth` z `640` do `960` oraz obniżenie segmentationIntervalMs do `16` (60fps segmentacji). Przy solo spotkaniu GPU ma pełen zapas mocy.

### Zmiana 6: Person-priority blending w strefie przejścia
W `applyImageBackground`, w strefie przejściowej zastosowanie bias na korzyść osoby: `personAlpha = t^0.7` zamiast liniowego `t`. Zmniejszy efekt "prześwitu" tła przez sylwetkę.

### Zmiana 7: Wyższy outputFps dla solo
Podniesienie `captureStream` FPS z 24 do 30 w `setParticipantCount(1)` - płynniejszy obraz przy 1 uczestniku.

---

## Oczekiwane rezultaty
- Krawędzie sylwetki: miękkie, naturalne przejście zamiast ostrych granic
- Brak "halo" wokół głowy i ramion
- Płynniejszy obraz (30fps output, 60fps segmentacja przy solo)
- Mniejsze obciążenie CPU dzięki cache'owaniu tła
- Lepsza precyzja dzięki wyższej rozdzielczości przetwarzania (960px vs 640px)

