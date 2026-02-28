

## Naprawa rozmycia tla na urzadzeniach mobilnych

### Problem

Dwa powiazane problemy z efektami tla na mobile:
1. **Rozmycie nie dziala** -- GPU delegate MediaPipe czesto nie jest wspierany lub dziala blednie na mobilnych GPU (szczegolnie starsze Android, iOS Safari)
2. **Odwrocona maska** -- gdy rozmycie "dziala", rozmywa osobe zamiast tla. Maska kategorii (`categoryMask`) na niektorych mobilnych GPU zwraca odwrocone wartosci (0 = osoba, 1 = tlo zamiast odwrotnie)

### Przyczyna

Kod w `VideoBackgroundProcessor.ts`:
- Uzywa `delegate: 'GPU'` bez fallbacku -- na mobile GPU delegate czesto failuje
- Uzywa `outputCategoryMask: true` ktory daje binarne 0/1 -- ich interpretacja moze byc odwrocona na roznych platformach
- Warunek `mask[i] === 0` (zamien na rozmycie) jest poprawny na desktopie, ale odwrocony na czesci urzadzen mobilnych

### Rozwiazanie

Zmiana w pliku `VideoBackgroundProcessor.ts`:

**1. Fallback z GPU na CPU delegate**

Zamiast sztywnego `delegate: 'GPU'`, proba inicjalizacji z GPU, a jesli sie nie uda -- restart z CPU:

```text
try {
  // Proba GPU
  this.segmenter = await ImageSegmenter.createFromOptions(vision, { 
    baseOptions: { delegate: 'GPU', ... } 
  });
} catch {
  // Fallback CPU
  this.segmenter = await ImageSegmenter.createFromOptions(vision, { 
    baseOptions: { delegate: 'CPU', ... } 
  });
}
```

**2. Zmiana na confidence masks**

Zamiast `outputCategoryMask: true` (binarny 0/1 z niejednoznaczna semantyka), uzycie `outputConfidenceMasks: true` ktore daje wartosc 0.0-1.0 (prawdopodobienstwo ze piksel to osoba). To jest jednoznaczne na wszystkich platformach:

- Wartosc bliska 1.0 = osoba (zachowaj oryginal)
- Wartosc bliska 0.0 = tlo (zamien na rozmycie/obraz)

```text
outputCategoryMask: false,
outputConfidenceMasks: true,
```

**3. Zmiana logiki compositing**

W `processFrame`, `applyBlur` i `applyImageBackground`:

Zamiast:
```text
const maskData = mask.getAsUint8Array();  // binarny 0/1
if (mask[i] === 0) { /* zamien na tlo */ }
```

Nowa logika:
```text
const masks = result.confidenceMasks;
const personMask = masks[0];  // selfie segmenter: index 0 = person confidence
const maskData = personMask.getAsFloat32Array();
// ...
const THRESHOLD = 0.5;
if (maskData[i] < THRESHOLD) { /* to tlo -- zamien */ }
```

### Plik do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoBackgroundProcessor.ts` | 1) GPU -> CPU fallback w initialize(). 2) Zmiana outputCategoryMask na outputConfidenceMasks. 3) Zmiana processFrame/applyBlur/applyImageBackground na uzycie float32 confidence z progiem 0.5 |

### Dlaczego to naprawi oba problemy

- **"Nie dziala"**: CPU delegate dziala na kazdym urzadzeniu (wolniejszy, ale niezawodny)
- **"Odwrocona maska"**: Confidence masks maja jednoznaczna semantyke -- wartosc 0-1 oznacza "jak bardzo to osoba". Nie ma odwrocenia bo nie ma binarnych kategorii do pomylenia

