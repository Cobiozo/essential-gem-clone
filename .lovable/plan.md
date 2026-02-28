

# Naprawa odbicia lustrzanego tla i jakosci konturu

## Problem 1: Tlo jest odbiciem lustrzanym

### Przyczyna
Lokalne wideo ma CSS `scale-x-[-1]` (plik VideoGrid.tsx linia 213), ktory odbija caly canvas — wlacznie z narysowanym tlem. Tlo jest rysowane normalnie na canvas, ale CSS flip powoduje ze wyglada jak w lustrze (widac "EO.OLOGY" od prawej do lewej na screenshocie).

### Rozwiazanie
W metodzie `applyImageBackground` rysowac tlo **odwrocone poziomo** na canvas, tak zeby po nalozeniu CSS `scaleX(-1)` wyswietlalo sie poprawnie. Uzyc `ctx.scale(-1, 1)` + przesuniecie przy rysowaniu tla na blurredCanvas.

## Problem 2: Zla jakosc konturu (meble przebijaja)

### Przyczyna
Obecna metoda: wielokrotne 1px erozje + sigmoid contrast to za malo. Model generuje maske 256x256, a po upscale do 640-800px kazdy piksel bledu jest widoczny. Kluczowe problemy:

1. **Erozja 1px jest za mala** — nawet 3 pasy nie wystarczaja przy upscale 3x
2. **Brak edge-aware refinement** — erozja jest slepna, obcina rowno osobe jak i tlo
3. **Temporal smoothing 40% to za duzo** — rozmywa krawedzie w czasie zamiast je ostrzyc
4. **Progi (0.75/0.50) sa za szerokie** — strefa mieszania jest za duza

### Rozwiazanie — kompletna przebudowa refineMask dla trybu image

**a) Mocniejsza erozja z wiekszym promieniem (radius=2):**
- Zamiast 3 osobnych erozji 1px, zrobic jedna erozje z promieniem 2px (sprawdzac 8-connected neighbors w odleglosci 2)
- To daje rownowartosc ~3px erozji ale w jednym przejsciu — szybciej i bardziej rownomiernie

**b) Ostrzejsze progi alfa-mieszania:**
- `personThresholdHigh: 0.75 -> 0.85` — wiecej pikseli musi byc "pewna osoba" zeby przejsc
- `personThresholdLow: 0.50 -> 0.60` — wezszy zakres mieszania (0.60-0.85 zamiast 0.50-0.75)
- Efekt: ostrzejsza granica, mniej "ducha" mebli

**c) Silniejszy kontrast sigmoid:**
- Pre-blur: `12 -> 14` (bardziej agresywne spychanie do 0/1)
- Post-blur: `10 -> 12`

**d) Lzejszy temporal smoothing:**
- `0.40 -> 0.25` wagi poprzedniej klatki dla image mode
- Szybsza reakcja na ruch = mniej ghostingu krawedzi

**e) Hard clamp na koncu:**
- Po calym pipeline, zastosowac hard clamp: jesli mask < 0.15 -> 0, jesli mask > 0.85 -> 1
- To eliminuje resztkowe wartosci posrednie ktore powoduja polprzezroczyste artefakty

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoBackgroundProcessor.ts` | (1) Flip tla w `applyImageBackground` — rysowac tlo odwrocone; (2) Nowa erozja radius-2; (3) Ostrzejsze progi image mode; (4) Silniejszy kontrast; (5) Lzejszy temporal smoothing; (6) Hard clamp |

## Szczegoly techniczne

### Flip tla (applyImageBackground)

```text
// Przed rysowaniem tla na blurredCanvas:
this.blurredCtx.save();
this.blurredCtx.scale(-1, 1);
this.blurredCtx.drawImage(bgImg, sx, sy, sw, sh, -width, 0, width, height);
this.blurredCtx.restore();
```

### Erozja radius-2 (nowa metoda)

```text
erodeMaskRadius2(mask, width, height):
  for each pixel (x, y):
    minVal = mask[y*w+x]
    // check all pixels within Manhattan distance 2
    for dy = -2 to 2:
      for dx = -2 to 2:
        if |dx|+|dy| <= 2 and in bounds:
          minVal = min(minVal, mask[(y+dy)*w+(x+dx)])
    tmp[y*w+x] = minVal
  mask.set(tmp)
```

### Hard clamp

```text
for i in mask:
  if mask[i] < 0.15: mask[i] = 0
  if mask[i] > 0.85: mask[i] = 1
```

## Efekt koncowy

- Tlo wyswietla sie poprawnie (bez odbicia lustrzanego)
- Kontur osoby jest ostry — meble i polki nie przebijaja
- Wlosy i obrys glowy sa czyste bez "aury"
- Ruch jest plynny bez ghostingu krawedzi

