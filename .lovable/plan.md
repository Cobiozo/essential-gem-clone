

## Naprawa efektow tla (rozmycie i wirtualne tla) we wszystkich trybach

### Zidentyfikowane problemy

Po analizie kodu znalazlem kilka potencjalnych przyczyn, dlaczego efekty tla nie dzialaja:

### Problem 1: Niestabilne URL-e CDN z `@latest`

W `VideoBackgroundProcessor.ts` (linia 134) uzywany jest URL:
```text
https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm
```

Tag `@latest` moze wskazywac na wersje WASM niezgodna z zainstalowana paczka `@mediapipe/tasks-vision@0.10.32`. Jesli WASM runtime jest np. w wersji 0.11.x a kod w 0.10.x, segmentacja cicho zawiedzie — model sie nie zaladuje albo zwroci puste maski.

Podobnie model (linia 138):
```text
https://storage.googleapis.com/mediapipe-models/.../latest/selfie_segmenter.tflite
```

**Rozwiazanie**: Przypiac URL-e do wersji `0.10.32` (zgodnej z zainstalowana paczka).

### Problem 2: Bledy inicjalizacji MediaPipe sa ciche dla uzytkownika

Gdy `applyBackground` zawiedzie (np. blad ladowania modelu), catch zwraca surowy stream bez zadnego komunikatu dla uzytkownika. Uzytkownik klika efekt, nic sie nie dzieje, brak informacji dlaczego.

**Rozwiazanie**: Dodac toast z informacja o bledzie i lepsze logowanie.

### Problem 3: Brak walidacji video tracka przed startem procesora

`processor.start(sourceStream)` nie sprawdza czy raw stream ma zywy i wlaczony video track. Jesli kamera jest wylaczona (`track.enabled = false`) lub track zakonczyl sie (`readyState === 'ended'`), canvas bedzie czarny i efekt nie bedzie widoczny.

**Rozwiazanie**: Przed wywolaniem `processor.start()`, sprawdzic czy raw stream ma zywy, wlaczony video track. Jesli nie — tymczasowo wlaczyc go, lub wyswietlic komunikat.

### Problem 4: `initPromise` nie jest resetowany po bledzie GPU+CPU

Jesli `ImageSegmenter.createFromOptions` zawiedzie zarowno z GPU jak i CPU, `this.initPromise` jest ustawiony na `null` (linia 158). Ale jesli blad wystapi przy pierwszym wywolaniu, kolejne wywolania `initialize()` probuja ponownie — co jest dobrze. Natomiast jesli juz raz sie powiodlo (`this.segmenter` jest ustawiony) ale segmenter jest uszkodzony (np. zwraca puste maski), nie ma mechanizmu retry.

**Rozwiazanie**: Dodac walidacje wynikow segmentacji i retry logike.

---

### Szczegolowe zmiany

**Plik 1: `src/components/meeting/VideoBackgroundProcessor.ts`**

1. Przypiac wersje CDN:
   - WASM: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm`
   - Model: uzyc stalej wersji zamiast `latest` (np. `https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/0.10.32/selfie_segmenter.tflite` — lub najblizsza dostepna wersja modelu)

2. Dodac walidacje video tracka w `start()`:
   ```text
   const videoTrack = inputStream.getVideoTracks()[0];
   if (!videoTrack || videoTrack.readyState === 'ended') {
     console.warn('[BackgroundProcessor] No live video track, returning input stream');
     return inputStream;
   }
   // Temporarily enable track if disabled
   const wasDisabled = !videoTrack.enabled;
   if (wasDisabled) videoTrack.enabled = true;
   ```

3. Dodac walidacje wynikow segmentacji w `processFrame`:
   - Liczyc ile razy pod rzad brak masek
   - Po 30 klatkach bez masek, logowac ostrzezenie i probowac reinicjalizowac segmenter

4. Dodac metode `isReady(): boolean` aby mozna bylo sprawdzic czy procesor jest gotowy

**Plik 2: `src/hooks/useVideoBackground.ts`**

1. W `applyBackground`, przed `processor.start()`:
   - Sprawdzic czy sourceStream ma zywy video track
   - Jesli nie, logowac i zwrocic sourceStream bez zmian

2. Dodac lepsze logowanie bledow (wyswietlic toast w UI)

**Plik 3: `src/components/meeting/VideoRoom.tsx`**

1. W `handleBackgroundChange`:
   - Dodac toast informujacy o bledzie gdy efekt nie zadziala
   - Sprawdzic czy kamera jest wlaczona — jesli nie, wyswietlic toast "Wlacz kamere aby uzyc efektow tla"
   - Jesli raw stream jest martwy (all tracks ended), wywolac `reacquireLocalStream()` i dopiero potem zastosowac efekt

---

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoBackgroundProcessor.ts` | Przypiac wersje CDN, walidacja video tracka, walidacja wynikow segmentacji |
| `src/hooks/useVideoBackground.ts` | Walidacja sourceStream, lepsze logowanie |
| `src/components/meeting/VideoRoom.tsx` | Toast na bledy, guard na wylaczona kamere, reacquire jesli stream martwy |

### Ryzyko

Niskie. Zmiany sa defensywne — dodaja walidacje i lepsze logowanie. Przypiecie wersji CDN zmniejsza ryzyko niestabilnosci. Jedyne potencjalne ryzyko: jesli model w wersji 0.10.32 nie jest dostepny pod stalym URL-em (Google Storage moze miec inna konwencje wersjonowania), ale to mozna obejsc testujac URL przed committem.

