

## Naprawa: Opoznienie video z desktop dla innych uczestnikow przy wlaczonym PiP

### Przyczyna

`VideoBackgroundProcessor` uzywa `requestAnimationFrame` (rAF) do petli renderowania klatek na canvas. Gdy uzytkownik wlaczy PiP i przejdzie na inna karte (co jest typowym scenariuszem PiP), przegladarka **drastycznie throttluje rAF** w kartach w tle -- czesto do 0-1 klatek/s lub calkowicie wstrzymuje.

Poniewaz strumien wysylany do innych uczestnikow pochodzi z `canvas.captureStream()`, zamrozenie canvasa = zamrozenie/opoznienie video u pozostalych uczestnikow.

**Dlaczego przycisk PiP dziala dobrze:** Bo uzytkownik pozostaje na karcie -- rAF dziala normalnie.

**Dlaczego auto-PiP (zmiana karty) powoduje lag:** Bo karta jest w tle -- rAF jest throttlowany.

### Rozwiazanie

W `VideoBackgroundProcessor.ts` dodac detekcje `visibilitychange`. Gdy karta jest w tle, przelaczac petle renderowania z `requestAnimationFrame` na `setTimeout` (ktory jest throttlowany do ~1s, ale NIE do 0 jak rAF). Dodatkowo uzyc nizszej czestotliwosci (np. 10fps) w tle, co daje plynny obraz u innych uczestnikow przy minimalnym zuzyciu zasobow.

### Zmiany techniczne

**Plik: `src/components/meeting/VideoBackgroundProcessor.ts`**

1. **Nowe pola klasy:**
   - `private isTabHidden = false` -- sledzi stan widocznosci karty
   - `private backgroundIntervalId: number | null = null` -- ID intervalu dla trybu tla
   - `private visibilityHandler: (() => void) | null = null` -- referencja do handlera

2. **Nowa metoda `setupVisibilityHandler()`** -- wywolana w `start()`:
   - Na `document.hidden = true`: anuluje biezacy `requestAnimationFrame`, uruchamia `setInterval` z opoznieniem ~100ms (10fps)
   - Na `document.hidden = false`: czysci interval, wznawia `requestAnimationFrame`

3. **Modyfikacja `processFrame`:**
   - Gdy `isTabHidden`, nie wywoluje `requestAnimationFrame` na koncu (bo interval juz steruje petla)
   - Reszta logiki bez zmian

4. **Modyfikacja `stop()`:**
   - Czysci interval i usuwa listener `visibilitychange`

### Szkic implementacji

```text
// Nowe pola klasy:
private isTabHidden = false;
private backgroundIntervalId: ReturnType<typeof setInterval> | null = null;
private visibilityHandler: (() => void) | null = null;

// Nowa metoda:
private setupVisibilityHandler() {
  this.visibilityHandler = () => {
    if (document.hidden) {
      this.isTabHidden = true;
      // Anuluj rAF
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      // Uruchom setTimeout-based loop (~10fps)
      if (!this.backgroundIntervalId) {
        this.backgroundIntervalId = setInterval(() => {
          if (this.isRunning) this.processFrame(performance.now());
        }, 100);
      }
    } else {
      this.isTabHidden = false;
      // Zatrzymaj interval
      if (this.backgroundIntervalId) {
        clearInterval(this.backgroundIntervalId);
        this.backgroundIntervalId = null;
      }
      // Wznow rAF
      if (this.isRunning && !this.animationFrameId) {
        this.animationFrameId = requestAnimationFrame(this.processFrame);
      }
    }
  };
  document.addEventListener('visibilitychange', this.visibilityHandler);
}

// Modyfikacja processFrame (koniec metody):
// Zamiast bezwarunkowego:
//   this.animationFrameId = requestAnimationFrame(this.processFrame);
// Uzyc:
if (!this.isTabHidden) {
  this.animationFrameId = requestAnimationFrame(this.processFrame);
}

// Modyfikacja stop():
if (this.backgroundIntervalId) {
  clearInterval(this.backgroundIntervalId);
  this.backgroundIntervalId = null;
}
if (this.visibilityHandler) {
  document.removeEventListener('visibilitychange', this.visibilityHandler);
  this.visibilityHandler = null;
}
```

### Podsumowanie

| Zmiana | Opis |
|--------|------|
| Nowe pola klasy | `isTabHidden`, `backgroundIntervalId`, `visibilityHandler` |
| `setupVisibilityHandler()` | Przelacza rAF <-> setInterval przy zmianie widocznosci |
| `processFrame` koniec | Warunkowe wywolanie rAF (tylko gdy karta widoczna) |
| `start()` | Wywolanie `setupVisibilityHandler()` |
| `stop()` | Czyszczenie intervalu i listenera |

