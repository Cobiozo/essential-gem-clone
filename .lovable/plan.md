

## Naprawa auto-PiP po przełączeniu karty

### Przyczyna

Niedawna zmiana `<audio>` na ukryty `<video>` w komponencie `AudioElement` (dla lepszego AEC) spowodowala problem z auto-PiP. Teraz `document.querySelectorAll('video')` zwraca rowniez te ukryte elementy audio-only. Poniewaz maja one `srcObject` (pelny stream z video trackami), moga miec `videoWidth > 0` i pasowac do selektora PiP -- przeglądarka probuje otworzyc PiP na ukrytym elemencie zamiast na widocznym filmie uczestnika.

### Rozwiazanie

1. Oznaczyc ukryte elementy `<video>` w `AudioElement` atrybutem `data-audio-only="true"`
2. Wykluczyc je z selektorow PiP we wszystkich trzech miejscach w `VideoRoom.tsx`

### Zmiany

**Plik 1: `src/components/meeting/VideoGrid.tsx`**

W `AudioElement` (linia 93) dodac atrybut:
```text
<video ref={ref} autoPlay playsInline data-audio-only="true" style={{ display: 'none' }} />
```

**Plik 2: `src/components/meeting/VideoRoom.tsx`**

Trzy miejsca do poprawy:

1. **Auto-PiP on tab switch** (linia 1654-1658): Dodac `v.getAttribute('data-audio-only') !== 'true'` do filtrow `find()`:
```text
pipVideo = Array.from(allVideos).find(
  v => v.srcObject && v.videoWidth > 0 && !v.paused 
    && v.getAttribute('data-local-video') !== 'true'
    && v.getAttribute('data-audio-only') !== 'true'
) as HTMLVideoElement || ...
```
I analogicznie w fallbacku (linia 1657).

2. **Manual PiP toggle** (linia 1616-1621): Dodac ten sam filtr.

3. **Auto-PiP on screen share** (linia 1577-1580): Dodac filtr `data-audio-only`.

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoGrid.tsx` | AudioElement: dodac `data-audio-only="true"` do `<video>` |
| `src/components/meeting/VideoRoom.tsx` | Wykluczyc `data-audio-only` z selektorow PiP w 3 miejscach |

### Ryzyko

Minimalne. Zmiana polega na dodaniu atrybutu i filtra -- brak wplywu na inne funkcjonalnosci.

