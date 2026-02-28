

# Poprawa jakości konturu — analiza tekstu vs aktualny kod i plan naprawy

## Analiza sugestii z tekstu

### 1. "Użyj modelu complex, nie lite" — TO JEST KLUCZ
**Aktualny stan**: Kod używa `selfie_multiclass_256x256` — model który **zawsze** generuje maskę 256x256 pikseli, niezależnie od rozdzielczości wejścia. Przy przetwarzaniu 800px to oznacza **3x upscale** maski. Każdy piksel błędu na krawędzi staje się 3-pikselowym artefaktem. Żadna ilość erozji, kontrastów i clampów tego nie naprawi — bo dane wejściowe maski są zbyt niskiej rozdzielczości.

**Rozwiązanie**: Przełączyć na model `selfie_segmenter` (landscape) — ten model generuje maskę **w rozdzielczości wejścia** (np. 640x480 → maska 640x480). Jest już w kodzie jako FALLBACK, ale nigdy nie jest użyty jako primary. To da ~6x więcej pikseli na krawędzi.

Zmiana: Dla trybu `image` używać `selfie_segmenter` jako primary model (lepsza rozdzielczość krawędzi), a `multiclass` zostawić jako fallback.

### 2. "Temporal smoothing" — JUŻ JEST, ale do poprawy
Aktualny kod ma temporal smoothing (krok 5 w `refineMask`, waga 0.25). To jest OK, ale z lepszym modelem potrzebuje dostrojenia:
- Z maską full-res temporal smoothing może być delikatniejszy (0.15-0.20) bo same dane wejściowe są stabilniejsze.

### 3. "Edge feathering via WebGL shader" — PRAGMATYCZNE PODEJŚCIE
WebGL shader byłby idealny ale:
- Wymaga kompletnej przebudowy renderera (teraz wszystko jest Canvas2D + `getImageData` pixel-by-pixel)
- Ryzyko regresji na urządzeniach bez dobrego WebGL
- Czas implementacji: 3-5x więcej

**Zamiast tego**: Z maską full-res (punkt 1) wystarczy delikatne Gaussian blur (2px) na krawędziach — obecne podejście Canvas2D będzie działać znacznie lepiej, bo będzie operować na danych o wyższej rozdzielczości. Nie trzeba przepisywać na WebGL.

### 4. "requestAnimationFrame + akceleracja sprzętowa" — JUŻ JEST
Kod już używa `requestAnimationFrame` (linia 425) i próbuje GPU delegate dla MediaPipe (linia 172). Tu nie ma co zmieniać.

## Główna przyczyna problemu

**Model `selfie_multiclass_256x256` generuje maskę 256x256 — to jest "lite" odpowiednik**. Cały pipeline post-processingu (erozja, kontrast, clamp) to łatanie objawów, nie przyczyny. Po przełączeniu na `selfie_segmenter` (full-res output) większość obecnych "poprawek" stanie się zbędna lub nawet szkodliwa (erodeMaskRadius2 będzie obcinać włosy przy masce full-res).

## Plan implementacji

### Plik: `src/components/meeting/VideoBackgroundProcessor.ts`

**A) Zmiana primary modelu:**
- PRIMARY: `selfie_segmenter` (full-res output, lepsze krawędzie)
- FALLBACK: `selfie_multiclass_256x256` (jak dotychczas)
- Zachować flagę `isMulticlassModel` żeby pipeline wiedział jak interpretować wynik
- Logika parsowania maski się nie zmienia: `selfie_segmenter` zwraca pojedynczą confidence mask (person), multiclass zwraca wiele klas

**B) Uproszczenie `refineMask` dla trybu image z modelem full-res:**
- Usunąć `erodeMaskRadius2` (zbędne z maską full-res — obcinało włosy i drobne detale)
- Zmniejszyć pre-blur kontrast z 14 → 8 (maska full-res nie potrzebuje tak agresywnego spychania)
- Zmniejszyć post-blur kontrast z 12 → 6
- Zachować `erodeDilateMask` (1px erode+dilate) — to nadal pomaga przy cienkich artefaktach
- Zmienić spatial blur z `1px` → `2px` dla image mode — delikatne feathering krawędzi zamiast twardego cięcia
- Zmienić hard clamp z (0.15/0.85) → (0.08/0.92) — szerszy zakres dozwolonych wartości = gładsze przejścia
- Zmienić temporal smoothing z 0.25 → 0.18 — maska full-res jest stabilniejsza, mniej wygładzania potrzebne

**C) Zachowanie kompatybilności wstecznej:**
- Tryby `blur-light` i `blur-heavy` — BEZ ZMIAN (tam 256x256 wystarczy, bo blur maskuje niedoskonałości)
- Jeśli `selfie_segmenter` nie załaduje się (stare urządzenia) → fallback na multiclass, a `refineMask` wykryje flagę `isMulticlassModel` i użyje agresywniejszych parametrów jak dotychczas
- Profile mobilne — BEZ ZMIAN
- Visibility handler, passthrough, overload detection — BEZ ZMIAN

**D) Progi alfa-mieszania dla image mode:**
- `personThresholdHigh: 0.85 → 0.75` (z maską full-res nie trzeba tak agresywnie filtrować)
- `personThresholdLow: 0.60 → 0.40` (szerszy gradient = płynniejsze przejście osoba/tło)

### Zachowane bez zmian:
- Flip tła (linia 619-622) — działa poprawnie
- `applyBlur` — bez zmian
- `applyImageBackground` — bez zmian (tylko progi z BLUR_PROFILES się zmienią)
- Cały flow `start()`, `stop()`, `destroy()`
- `setParticipantCount` — bez zmian
- `useVideoBackground.ts` — bez zmian

## Podsumowanie

Jedna zmiana — przełączenie modelu z 256x256 na full-res — rozwiąże 80% problemu z konturem. Reszta to dostrojenie parametrów post-processingu do nowej, lepszej maski. Bez naruszania blur mode, mobilnych profili ani żadnej innej funkcjonalności.
