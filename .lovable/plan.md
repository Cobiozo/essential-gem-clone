
# Naprawa uploadu wlasnych tel i dalsza poprawa jakosci maski

## Problem 1: Upload wlasnego tla nie dziala

**Przyczyna**: Klikniecie `DropdownMenuItem` z `onClick={() => fileInputRef.current?.click()}` zamyka dropdown menu (domyslne zachowanie Radix). Gdy dropdown sie zamyka, element `<input ref={fileInputRef}>` jest usuwany z DOM zanim przegladarka zdarzy otworzyc dialog wyboru pliku. W efekcie `fileInputRef.current?.click()` albo nie dziala, albo trafia na juz usuniety element.

**Rozwiazanie**: Przeniesienie `<input type="file">` poza `DropdownMenuContent` (na poziom komponentu `BackgroundSelector`). Dodatkowo uzycie `onSelect` z `e.preventDefault()` na `DropdownMenuItem` aby zapobiec zamknieciu dropdown przed kliknieciem inputa, albo prostsze rozwiazanie: wywolanie `click()` na input przed zamknieciem menu przez uzycie `setTimeout`.

Najsolidniejsze podejscie: przeniesc `<input>` poza dropdown i uzyc `setTimeout(() => fileInputRef.current?.click(), 0)` w onClick, co pozwoli dropdown sie zamknac a nastepnie otworzy dialog plikow.

**Plik**: `src/components/meeting/BackgroundSelector.tsx`

## Problem 2: Jakosc maski — tlo przebija przez sylwetke

Na screenshotach widac ze postprocessing (erode/dilate/contrast) nie wystarczy — surowe dane z modelu segmentacji sa zbyt zaszumione, szczegolnie w okolicach brody i wlosow.

**Przyczyny**:
- Rozdzielczosc przetwarzania 720px moze byc za niska dla dokladnej segmentacji brody
- Blur maski 3px za bardzo rozmywa krawedzie po kontrastowaniu
- Erode/dilate 1px moze nie wystarczac — "halo" ma czesto 2-3 piksele szrokosci
- Temporal smoothing 35/65 moze byc za slabe — krawedzie migocza

**Rozwiazanie — agresywniejsze parametry**:

### a) Zwiekszenie rozdzielczosci przetwarzania
- Desktop (1 uczestnik): 720 -> 960px — wiecej detali w masce
- Desktop (2 uczestnikow): 480 -> 640px

### b) Ostrzejsze progi maski
```text
                    Obecne          Nowe
blur-light/image:
  thresholdHigh     0.70            0.75
  thresholdLow      0.45            0.50

blur-heavy:
  thresholdHigh     0.65            0.70
  thresholdLow      0.40            0.45
```

Strefa przejsciowa zmniejszona z 0.25 do 0.20 — ostrzejszy kontur.

### c) Zmniejszenie blur maski
- 3px -> 2px — mniej rozmywania krawedzi po kontrastowaniu

### d) Silniejszy kontrast sigmoid
- Pre-blur: 8 -> 10
- Post-blur: 6 -> 8

### e) Silniejsze temporal smoothing
- 35/65 -> 40/60 — silniejsze tlumienie migotania krawedzi

### f) Podwojne erode/dilate
- Zamiast jednego przebiegu erode->dilate, wykonac dwa: erode->erode->dilate->dilate
- Skuteczniej usuwa "halo" o szerokosci 2-3px

**Plik**: `src/components/meeting/VideoBackgroundProcessor.ts`

## Zmiany techniczne

### Plik 1: `src/components/meeting/BackgroundSelector.tsx`
- Przesuniecie `<input type="file">` z wnetrza `DropdownMenuContent` na koniec komponentu (po `</DropdownMenu>`)
- Zmiana `onClick` na `setTimeout(() => fileInputRef.current?.click(), 50)` aby dac dropdown czas na zamkniecie

### Plik 2: `src/components/meeting/VideoBackgroundProcessor.ts`
- `DESKTOP_PROFILE.maxProcessWidth`: 720 -> 960
- `setParticipantCount`: zaktualizowac progi (count>=2: 480->640, count>=4: 320->480)
- `BLUR_PROFILES`: zaostrzenie progow (0.75/0.50, 0.70/0.45)
- `refineMask`: contrastMask(10) pre-blur, contrastMask(8) post-blur
- Blur maski: 3px -> 2px
- Temporal smoothing: 0.40/0.60
- `erodeDilateMask`: podwojny przebieg (erode 2x, dilate 2x)

## Ryzyko

- Wyzsze rozdzielczosci (960px) moga spowolnic przetwarzanie na slabszych maszynach, ale system overload detection przejdzie automatycznie w pass-through mode jesli klatka trwa >250ms
- Ostrzejsze progi moga powodowac lekkie "wcinanie" w sylwetke (np. cienkie palce moga zniknac), ale to lepsze niz halo/przebijanie tla
