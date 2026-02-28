
## Naprawa efektow tla na desktopie

### Problem

Efekty rozmycia i wirtualnego tla dzialaja na mobile ale nie na desktopie. Przyczyna: `DESKTOP_PROFILE` w `VideoBackgroundProcessor.ts` ma zbyt agresywne ustawienia -- przetwarza obraz w rozdzielczosci 960px (4x wiecej pikseli niz mobile 480px), ale daje tylko 60ms na klatke zanim uzna za "przeciazenie" (mobile ma 120ms).

Pipeline przetwarzania jednej klatki:
1. `getImageData` na ~518 400 pikseli (960x540)
2. `smoothMask` - zapis maski jako obraz, blur CSS, odczyt
3. Petla per-piksel blendujaca tlo
4. `putImageData`

Na wiekszosci komputerow ten pipeline trwa >60ms. Po 15 kolejnych klatkach przekraczajacych prog, system przechodzi w tryb pass-through (rysuje surowe video bez efektu). Uzytkownik widzi ze "efekt nie dziala".

Mobile dziala, bo: 480x270 = 130K pikseli (4x mniej) + prog 120ms (2x wyzszy).

### Rozwiazanie

**Plik: `src/components/meeting/VideoBackgroundProcessor.ts`**

Zmiana `DESKTOP_PROFILE` na realistyczne wartosci:

```text
// PRZED:
const DESKTOP_PROFILE: PerformanceProfile = {
  maxProcessWidth: 960,
  segmentationIntervalMs: 50,
  outputFps: 24,
  overloadThresholdMs: 60,
};

// PO:
const DESKTOP_PROFILE: PerformanceProfile = {
  maxProcessWidth: 640,
  segmentationIntervalMs: 66,
  outputFps: 24,
  overloadThresholdMs: 150,
};
```

Zmiany:
- `maxProcessWidth`: 960 -> 640 -- zmniejszenie rozdzielczosci przetwarzania o ~56% pikseli (640x360 = 230K vs 960x540 = 518K). Jakosc segmentacji nie spada znaczaco, bo model i tak operuje na mniejszej siatce wewnetrznie
- `segmentationIntervalMs`: 50 -> 66 -- ~15 segmentacji/s zamiast 20, daleko powyzej percepcji ludzkiego oka
- `overloadThresholdMs`: 60 -> 150 -- realistyczny prog; nawet jesli klatka trwa 100ms, efekt nadal jest widoczny i plynny. Pas-through wlacza sie dopiero przy prawdziwym przeciazeniu

Dodatkowo, podniesc prog overload counter z 15 do 30, aby system byl bardziej odporny na sporadyczne skoki:

```text
// PRZED (linia ~305):
if (this.overloadCounter > 15) {

// PO:
if (this.overloadCounter > 30) {
```

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoBackgroundProcessor.ts` | DESKTOP_PROFILE: maxProcessWidth 960->640, segmentationIntervalMs 50->66, overloadThresholdMs 60->150; overload counter 15->30 |
