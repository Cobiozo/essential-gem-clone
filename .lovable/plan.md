

# Naprawa rozbieznosci miedzy edytorem a podgladem certyfikatu

## Zidentyfikowane problemy

Na podstawie analizy kodu zidentyfikowalem **3 kluczowe rozbieznosci** miedzy edytorem (Fabric.js canvas po lewej), podgladem na zywo (Canvas API po prawej) a finalnym PDF (jsPDF):

### Problem 1: Podglad jest za maly i przyciety
Podglad skaluje sie do `Math.min(500 / canvasWidth, 1)` = ~0.59, co daje miniaturke ~500px szerokosc. Przy tak malym rozmiarze tekst jest nieczytelny, a elementy wyglabaja na przesuniete. Kontener jest zbyt waski (panel boczny).

### Problem 2: Rozmiar czcionki — rozna konwersja w PDF vs podglad
- **Podglad (Canvas API)**: uzywa `fontSize` bezposrednio w px (np. 36px)
- **PDF (jsPDF)**: uzywa `fontSize * 0.75` (linia 318: `doc.setFontSize(fontSizeVal * 0.75)`) bo konwertuje px->pt
- **Efekt**: tekst w podgladzie jest ~33% wiekszy niz w finalnym PDF

### Problem 3: Pozycja Y tekstu — rozne obliczenia
- **Podglad**: `ctx.textBaseline = 'top'`, pozycja Y = `y` (bezposrednio)
- **PDF**: pozycja Y = `y + fontSizeVal * PX_TO_MM` (dodaje przesuniecie o rozmiar czcionki)
- **Efekt**: tekst w podgladzie jest przesuniety w pionie wzgledem PDF

## Rozwiazanie

Naprawienie CertificatePreview.tsx aby renderowanie bylo **identyczne** z logika w useCertificateGeneration.ts. Podglad musi dzialac jak wierny symulator PDF.

### Zmiana 1: Skalowanie podgladu (CertificatePreview.tsx)
Zmiana stalej skali z `Math.min(500 / canvasWidth, 1)` na wieksza wartosc dopasowana do kontenera, np. `Math.min(450 / canvasWidth, 1)` — ale glowny problem to za maly kontener. Podglad powinien rozciagac sie bardziej.

### Zmiana 2: Korekta rozmiaru czcionki w podgladzie
Dodanie mnoznika `* 0.75` do fontSize w renderowaniu tekstu, aby odpowiadal konwersji px->pt stosowanej w jsPDF:
```
// Przed (zle):
ctx.font = `... ${fontSize}px ...`;

// Po (poprawnie):
const adjustedFontSize = fontSize * 0.75;
ctx.font = `... ${adjustedFontSize}px ...`;
```

### Zmiana 3: Korekta pozycji Y tekstu
Dodanie przesuniecia Y identycznego jak w jsPDF:
```
// Przed (zle):
const lineY = y + (lineIndex * lineHeight);

// Po (poprawnie - symuluje jsPDF offset):
const yOffset = fontSize * 0.75 * PX_TO_MM_RATIO;
const lineY = y + yOffset + (lineIndex * lineHeight);
```

Ale uwaga - podglad pracuje w px a PDF w mm. Trzeba to wyrownac: w podgladzie pracujemy w pikselach, wiec offset powinien byc `fontSize * 0.75` (tyle samo co adjustedFontSize), poniewaz jsPDF dodaje `fontSizeVal * PX_TO_MM` w mm, co odpowiada `fontSizeVal * 0.75` w proporcji px-renderingu.

### Zmiana 4: Zawijanie tekstu z poprawionym fontSize
Funkcja `wrapText` musi uzywac tego samego skorygowanego rozmiaru czcionki, zeby obliczenia szerokosc linii sie zgadzaly.

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/admin/CertificatePreview.tsx` | Korekta fontSize (*0.75), korekta pozycji Y tekstu, poprawiony lineHeight, lepsza szerokosc podgladu |

## Szczegoly techniczne

W `CertificatePreview.tsx`, w bloku renderowania tekstu (linia 176-253):

1. **fontSize**: `const adjustedFontSize = fontSize * 0.75;` — uzyc `adjustedFontSize` w `ctx.font` i obliczeniach
2. **Y offset**: dodac `adjustedFontSize` do pozycji Y (symuluje `y + fontSizeVal * PX_TO_MM` z jsPDF, ktore w px-space odpowiada przesunieciu o rozmiar czcionki)  
3. **lineHeight**: uzyc `adjustedFontSize * 1.2` zamiast `fontSize * 1.2`
4. **wrapText**: wywolywac z `adjustedFontSize` ustawionym w `ctx.font` (juz bedzie poprawne bo ctx.measureText uzywa aktualnego fontu)

Te zmiany zapewnia ze podglad bedzie wiernie odzwierciedlal finalny PDF.
