

# Naprawa wskaznika buforowania 81% i ukrycie zrodla w diagnostyce

## Problem 1: Buforowanie pokazuje 81% mimo normalnego odtwarzania

Wskaznik bufferProgress jest obliczany jako `(bufferedAhead / minBufferSeconds) * 100`. Dla desktopa `minBufferSeconds = 2`, wiec jesli przegladarka zbuforowala np. 1.62s do przodu, progress = 81%.

Ale odtwarzanie dziala normalnie, bo przegladarka pobiera dane bezposrednio z VPS (po naszej zmianie na JSON resolve) i buforuje na biezaco. Problem: wskaznik "Buforowanie: 81%" jest pokazywany uzytkownikowi mimo ze wideo gra plynnie — to dezorientujace.

**Rozwiazanie:** Wskaznik buforowania powinien byc widoczny TYLKO gdy wideo jest faktycznie wstrzymane z powodu buforowania (`isInitialBuffering || isSmartBuffering`). Aktualnie `bufferProgress` jest przekazywany zawsze, a VideoControls pokazuje go gdy `isBuffering` jest true. Problem jest w tym ze `isInitialBuffering` lub `isSmartBuffering` moze byc true mimo plynnego odtwarzania — logika "canPlay" nie zawsze wystarczy.

Po analizie kodu: `bufferProgress` jest obliczany wzgledem `minBufferSeconds` (2s na desktopie). Jesli bufor wyprzedza aktualna pozycje o 1.6s, to 1.6/2 = 80%. Ale wideo gra bo 1.6s bufora wystarczy dla plynnego odtwarzania. Stan `isInitialBuffering` zostaje `true` dopoki bufor nie osiagnie 100% — to blokuje play i pokazuje wskaznik mimo gotowosci.

**Fix:** Zmienic warunek odblokowania z `bufferedAheadValue >= targetBuffer` na bardziej tolerancyjny prog, np. 80% bufora wystarczy do odblokowania odtwarzania. Alternatywnie: jesli wideo juz gra (nie jest paused), ukryc wskaznik buforowania.

## Problem 2: Diagnostyka admina pokazuje zrodlowy URL

W `VideoControls.tsx` diagnostyka admina zawiera:
- Pole "Zrodlo" z `videoSrc` (linia z `videoSrc.slice(-50)`)
- Funkcja `copyDiagnostics` kopiuje `videoSrc` do schowka

Po naszej zmianie `signedUrl` to teraz prawdziwy URL VPS (`purelife.info.pl/...`). Trzeba go ukryc w diagnostyce.

## Zmiany techniczne

### 1. `src/components/SecureMedia.tsx` — tolerancyjniejszy prog buforowania

Zmienic warunek odblokowania odtwarzania z wymagania 100% bufora na 70%:

```text
PRZED: if (isInitialBuffering && (bufferedAheadValue >= targetBuffer || progress >= 100))
PO:    if (isInitialBuffering && (bufferedAheadValue >= targetBuffer * 0.7 || progress >= 70))
```

Analogiczna zmiana w handleProgress i handleCanPlay.

### 2. `src/components/SecureMedia.tsx` — nie przekazuj prawdziwego URL do diagnostyki

```text
PRZED: videoSrc={signedUrl}
PO:    videoSrc={mediaTokenRef.current ? `[protected] token:${mediaTokenRef.current.slice(0,8)}...` : undefined}
```

### 3. `src/components/training/VideoControls.tsx` — usun pole "Zrodlo" z diagnostyki

Usunac sekcje wyswietlajaca `videoSrc` URL i usunac `videoSrc` z funkcji `copyDiagnostics`.

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/components/SecureMedia.tsx` | Prog buforowania 100% -> 70%, zamaskowanie URL w diagnostyce |
| `src/components/training/VideoControls.tsx` | Usuniecie prawdziwego URL z widoku diagnostyki i kopiowania |

