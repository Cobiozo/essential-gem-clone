

# Naprawa plynnosci obrazu i konturu tla

## Diagnoza

### Problem 1: Obraz sie zacina (spadek FPS)
Przyczyna: ostatnie zmiany drastycznie zwiekszly koszt kazdej klatki:
- Rozdzielczosc przetwarzania 960px — to ~2x wiecej pikseli niz 640px (920k vs 410k pikseli)
- Podwojne erode/dilate — 4 pelne iteracje po masce (2x erode + 2x dilate) zamiast 2
- Kontrastowanie z sila 10 i 8 — ciezsze obliczenia sigmoid na kazdym pikselu
- Te operacje lacznie moga przekraczac 16ms budzet klatki na srednim sprzecie

### Problem 2: Kontur nadal niedokladny
Agresywniejsze parametry nie pomagaja, bo problem jest fundamentalny — model `selfie_multiclass_256x256` produkuje maske o rozdzielczosci 256x256 niezaleznie od rozmiaru wejscia. Zwiekszanie inputu do 960px nie daje lepszej maski, tylko spowalnia skalowanie.

### Problem 3: Upload wlasnego tla nie dziala
Prawdopodobnie bucket `meeting-backgrounds` nie istnieje lub RLS blokuje operacje. Trzeba zweryfikowac i ewentualnie poprawic logike uploadu.

## Plan naprawy

### 1. Przywrocenie plynnosci — zmniejszenie kosztu per-klatka

**Plik: `VideoBackgroundProcessor.ts`**

a) **Rozdzielczosc przetwarzania z powrotem na 640px** (desktop, 1 uczestnik):
   - 960px nie daje lepszej maski (model i tak produkuje 256x256)
   - 640px to optymalne tlo: wystarczajaco duze dla kompozycji, szybkie do przetworzenia

b) **Jeden przebieg erode/dilate zamiast dwoch**:
   - Podwojny przebieg to 4 pelne iteracje po Float32Array — kosztowne
   - Jeden przebieg (erode + dilate) wystarczy z lepszymi progami

c) **Zmniejszenie sily kontrastowania**:
   - Pre-blur: 10 -> 7 (wystarczajaco ostre, ale szybsze)
   - Post-blur: 8 -> 5

d) **Temporal smoothing na 0.30/0.70** (zamiast 0.40/0.60):
   - 0.40 poprzednia klatka powoduje "lag" w sledzeniu ruchu — obraz za bardzo "ciagnie" za osoba
   - 0.30/0.70 daje plynne krawedzie bez opoznienia ruchu

e) **Segmentacja co 80ms zamiast 66ms** (desktop):
   - 66ms = 15 segmentacji/s — zbyt czesto dla plynnosci
   - 80ms = 12.5 segmentacji/s — wystarczajace, odczuwalnie lzejsze

### 2. Lepsza jakosc konturu — optymalizacja progow

**Plik: `VideoBackgroundProcessor.ts`**

Zamiast agresywnych progow ktore "wygryzaja" sylwetke, uzyc lagodniejszych z lepszym blendem:

```text
                  Obecne      Nowe
blur-light:
  thresholdHigh   0.75        0.65
  thresholdLow    0.50        0.35

blur-heavy:
  thresholdHigh   0.70        0.60
  thresholdLow    0.45        0.30

image:
  thresholdHigh   0.75        0.65
  thresholdLow    0.50        0.35
```

Szersza strefa przejsciowa (0.30) daje plynniejszy gradient alfa — zamiast ostrego "wyciecia" z artefaktami, jest lagodne przejscie. To wlasnie tak dziala Zoom/Teams/Google Meet — nie maja idealnie ostrego konturu, ale maja plynne przejscie ktore wyglada naturalnie.

Blur maski: 2px -> 3px — lagodniejsze wygladzanie krawedzi.

### 3. Naprawa uploadu wlasnych tel

**Plik: `BackgroundSelector.tsx`**

Problem: `DropdownMenuItem` domyslnie zamyka menu przy `onClick`. Nawet z `setTimeout`, jesli dropdown jest "controlled" (nie jest tutaj, ale Radix moze miec wewnetrzny stan), ref moze stracic focus. Rozwiazanie: uzyc `onSelect` z `preventDefault()` zamiast `onClick` z `setTimeout`, co zapobiega zamknieciu menu i pozwala otworzyc dialog plikow:

```typescript
<DropdownMenuItem
  onSelect={(e) => {
    e.preventDefault();
    fileInputRef.current?.click();
  }}
>
```

To jest oficjalny sposob Radix na zapobieganie zamknieciu menu.

**Plik: `useCustomBackgrounds.ts`**

Dodanie lepszego error handlingu i logowania — jesli bucket nie istnieje lub RLS blokuje, uzytkownik zobaczy jasny komunikat bledu.

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `VideoBackgroundProcessor.ts` | maxProcessWidth 960->640, segmentationIntervalMs 66->80, 1x erode/dilate, kontrast 7/5, temporal 0.30/0.70, progi 0.65/0.35, blur maski 3px |
| `BackgroundSelector.tsx` | `onSelect` z `preventDefault()` zamiast `onClick` z `setTimeout` |
| `useCustomBackgrounds.ts` | Lepsze logowanie bledow uploadu |

## Efekt

- **Plynnosc**: ~50% mniejszy koszt per-klatka (mniej pikseli, mniej iteracji, lzejsze operacje)
- **Kontur**: lagodne, naturalne przejscie (jak Zoom/Teams) zamiast ostrego z artefaktami
- **Upload**: naprawiony trigger dialogu plikow

