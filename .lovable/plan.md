
# Automatyczna pauza wideo przy opuszczeniu karty/aplikacji

## Problem

Kod juz zawiera handler `visibilitychange` ktory pauzuje wideo (linia 1170), ale sa miejsca w kodzie ktore automatycznie wznawiaja odtwarzanie (`video.play()`) po buforowaniu — nawet gdy karta jest ukryta. Scenariusz:

1. Uzytkownik oglada wideo (wasPlayingBeforeBufferRef = true)
2. Przelacza karte — wideo pauzuje poprawnie
3. Przegladarka emituje `canplay` lub `progress` event w tle
4. Handler widzi `wasPlayingBeforeBufferRef.current = true` i wola `video.play()`
5. Wideo wznawia odtwarzanie mimo ukrytej karty

Dodatkowo: na niektorych urzadzeniach mobilnych przelaczenie aplikacji moze nie wyzwalac `visibilitychange` — potrzebny jest tez `blur` event jako fallback.

## Rozwiazanie

### 1. Dodac guard `document.hidden` przed kazdym automatycznym `video.play()`

W trzech miejscach w glownym useEffect (linie 737, 775, 825) dodac warunek:

```text
PRZED:
  video.play().catch(console.error);

PO:
  if (!document.hidden) {
    video.play().catch(console.error);
  }
```

### 2. Dodac `blur` event jako dodatkowy fallback

W useEffect z visibilitychange (linia 1164) dodac nasluchiwanie na `blur` event okna, co obsluguje przelaczanie aplikacji na mobilnych:

```text
const handleWindowBlur = () => {
  if (videoRef.current && !videoRef.current.paused) {
    videoRef.current.pause();
    setIsTabHidden(true);
  }
};
window.addEventListener('blur', handleWindowBlur);
```

I cleanup:
```text
window.removeEventListener('blur', handleWindowBlur);
```

## Plik do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/SecureMedia.tsx` | Guard `document.hidden` przed 3x `video.play()`, dodanie `blur` event listenera |
