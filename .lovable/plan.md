
# Poprawa jakosci maski alfa w efektach tla

## Problem

Na screenshotach widac:
- Nierowe, "poszarpane" krawedzie wokol sylwetki
- Tlo przebijajace przez osobe (szczegolnie na wlosach i ramionach)
- Brak plynnego przejscia miedzy osoba a tlem
- Migotanie maski miedzy klatkami

## Przyczyny w aktualnym kodzie

1. **Model segmentacji**: Uzyty `selfie_segmenter` (float16) to podstawowy model MediaPipe. Istnieje lepszy model `selfie_multiclass_256x256` z dokladniejsza segmentacja.

2. **Progi alfa zbyt szerokie**: `personThresholdHigh: 0.55`, `personThresholdLow: 0.10-0.15`. Strefa przejsciowa jest za szeroka (0.40 zakresu), co powoduje duze "halo" wokol osoby.

3. **Wygaldzanie maski za slabe**: Tylko jeden przebieg `blur(4px)` na masce. Nie usuwa szumu pikselowego ani nie wygladzaja krawedzi wystarczajaco.

4. **Brak wygaldzania czasowego**: Kazda klatka ma niezalezna maske — powoduje migotanie na krawedziach sylwetki.

## Rozwiazanie

### 1. Lepszy model segmentacji

Zamiana na `selfie_multiclass_256x256` — model wieloklasowy MediaPipe z lepsza separacja wlosow, twarzy, ciala i tla. Zapasowy fallback na obecny model.

### 2. Zaostrzone progi alfa

Obecne wartosci vs nowe:

```text
                    Obecne          Nowe
blur-light:
  thresholdHigh     0.55            0.65
  thresholdLow      0.15            0.40

blur-heavy:
  thresholdHigh     0.55            0.60
  thresholdLow      0.10            0.35

image:
  thresholdHigh     0.55            0.65
  thresholdLow      0.10            0.40
```

Wezsza strefa przejsciowa (0.25 zamiast 0.40-0.45) da ostrzejsze krawedzie.

### 3. Wieloprzebiegowe wygaldzanie maski

Zamiast jednego `blur(4px)`:
- Krok 1: Kontrastowanie maski (sigmoid/power curve) — wzmacnia roznice miedzy osoba (blisko 1.0) a tlem (blisko 0.0), eliminujac "szare" piksele
- Krok 2: Lekki blur maski (3px) — wygladzenie krawedzi bez utraty ostrosci
- Krok 3: Ponowne kontrastowanie po blurze — przywraca ostre krawedzie

### 4. Wygaldzanie czasowe (temporal smoothing)

Blend biezacej maski z poprzednia klatka:
```text
finalMask[i] = previousMask[i] * 0.3 + currentMask[i] * 0.7
```
Redukuje migotanie na krawedziach miedzy klatkami, zachowujac reaktywnosc na ruch.

### 5. Wyzsze limity rozdzielczosci przetwarzania

Obecna maksymalna szerokosc to 640px (desktop, 1 uczestnik). Zwiekszenie do 720px da wiecej detali w masce bez znaczacego spadku wydajnosci na nowoczesnym GPU.

## Zmiany techniczne

### Plik: `src/components/meeting/VideoBackgroundProcessor.ts`

1. **Model URL**: Zamiana na `selfie_multiclass_256x256` z fallbackiem na obecny model
2. **BLUR_PROFILES**: Nowe progi (wyzszy high, wyzszy low, wezsza strefa przejscia)
3. **smoothMask()**: Przepisanie na wieloprzebiegowe: kontrast -> blur -> kontrast + temporal blending z poprzednia maska
4. **DESKTOP_PROFILE.maxProcessWidth**: 640 -> 720
5. **Nowy bufor `previousMask`**: Do temporal smoothing

## Wplyw na wydajnosc

- Nowy model moze byc nieco ciezszy, ale `selfie_multiclass_256x256` jest zoptymalizowany pod katem GPU i dziala porownywalna szybko
- Dodatkowe operacje na masce (sigmoid + blend) sa tanie — operacje na Float32Array, brak dodatkowych renderow canvas
- Zwiekszenie rozdzielczosci z 640 na 720 to ~26% wiecej pikseli, ale w ramach zapasu wydajnosciowego (overload threshold 250ms)
- Temporal smoothing to jedna dodatkowa iteracja po masce — pomijalna koszt

## Ryzyko

Niskie. Wszystkie zmiany sa w jednym pliku. Fallback na obecny model zabezpiecza kompatybilnosc. Progi mozna latwo dostroic.
