

## Naprawa 3 problemow: pikselowate kontury, PiP pokazuje siebie, echo dzwiekowe

### Problem 1: Pikselowate/ostre kontury wokol uzytkownika

**Przyczyna:** Maska segmentacji jest nakładana piksel po pikselu bez jakiegokolwiek wygladzania. Przejscie miedzy osoba a tlem odbywa sie na granicy 2-3 pikseli (strefa personThresholdLow - personThresholdHigh), co przy niskiej rozdzielczosci przetwarzania (480px mobile, 960px desktop) daje ostre, pikselowate krawedzie.

**Rozwiazanie:** Dodac rozmycie Gaussa na samej masce segmentacji przed jej zastosowaniem. Zamiast rozmywac maske jako oddzielny obraz (kosztowne), poszerzyc strefe przejscia (soft blend zone) i zastosowac wygladzanie na maskach poprzez:

1. Zwiekszenie strefy przejscia w profilach rozmycia (wieksza roznica miedzy personThresholdLow a personThresholdHigh)
2. Dodanie pre-blur maski na osobnym ukladzie canvas -- rysujemy maske jako obraz w skali szarosci, aplikujemy CSS blur na canvas, odczytujemy wygladzona maske

**Plik: `src/components/meeting/VideoBackgroundProcessor.ts`**

- Dodac nowy prywatny canvas `maskCanvas` + `maskCtx` do wygladzania maski
- W `start()`: utworzyc maskCanvas o wymiarach processWidth x processHeight
- Nowa metoda `smoothMask(mask, width, height)`: 
  - Rysuje maske jako obraz szarosci na maskCanvas
  - Aplikuje `ctx.filter = 'blur(3px)'` na maskCanvas
  - Odczytuje wygladzone piksele z powrotem do Float32Array
- Wywolywac `smoothMask()` po kazdej nowej segmentacji (przed cache'owaniem)
- Poszerzyc strefe przejscia w BLUR_PROFILES:
  - blur-light: personThresholdHigh 0.45->0.55, personThresholdLow 0.25->0.15
  - blur-heavy: personThresholdHigh 0.40->0.55, personThresholdLow 0.20->0.10
  - image: personThresholdHigh 0.40->0.55, personThresholdLow 0.20->0.10

### Problem 2: PiP pokazuje lokalnego uzytkownika zamiast mowcy

**Przyczyna:** W `handleTogglePiP` (linia 1414) i auto-PiP (linia 1447), fallback szuka "dowolnego video z srcObject i videoWidth > 0". Na wielu urzadzeniach pierwsze takie video to wlasnie lokalne (jest zawsze aktywne). Warunek `!v.muted` nie pomaga bo lokalne video moze nie miec atrybutu muted na elemencie DOM jezeli jest obslugiwane inaczej.

**Rozwiazanie:** Uzyc atrybutu `data-local-video` ktory juz istnieje na VideoTile (linia 117: `data-local-video={participant.isLocal ? 'true' : undefined}`) do filtrowania. Szukac video ktore NIE ma `data-local-video="true"`.

**Plik: `src/components/meeting/VideoRoom.tsx`**

W `handleTogglePiP` i w auto-PiP `handleVisibility`, zmienic logike fallback:
```text
// Zamiast:
pipVideo = Array.from(allVideos).find(v => v.srcObject && v.videoWidth > 0 && !v.paused);

// Na:
pipVideo = Array.from(allVideos).find(
  v => v.srcObject && v.videoWidth > 0 && !v.paused && v.getAttribute('data-local-video') !== 'true'
) || Array.from(allVideos).find(v => v.srcObject && v.videoWidth > 0 && !v.paused);
```

To samo w auto-PiP na screen share (linia 1391-1404).

### Problem 3: Echo dzwiekowe (slychac siebie)

**Przyczyna:** W trybie Speaker i Multi-speaker, zdalne strumienie sa podlaczone do dwoch elementow `<video>` jednoczesnie:
1. Glowny kafelek VideoTile - `muted={participant.isLocal}` (poprawne - zdalny NIE wyciszony)
2. Miniaturka ThumbnailTile (linia 192) - `muted={participant.isLocal}` (BUG - zdalny NIE wyciszony = podwojny dzwiek)
3. MiniVideo (linia 425) - `muted={participant.isLocal}` (BUG - to samo)

Podwojne odtwarzanie tego samego strumienia audio z dwoch elementow video sprawia, ze echo cancellation przegladarki nie dziala prawidlowo.

**Rozwiazanie:** Wyciszyc WSZYSTKIE miniaturki bezwarunkowo. Audio powinno byc odtwarzane tylko z jednego elementu video na uczestnika.

**Plik: `src/components/meeting/VideoGrid.tsx`**

- ThumbnailTile (linia 192): zmiana `muted={participant.isLocal}` na `muted`
- MiniVideo (linia 425): zmiana `muted={participant.isLocal}` na `muted`

### Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoBackgroundProcessor.ts` | Dodanie wygladzania maski (mask blur) + szersze strefy przejscia |
| `src/components/meeting/VideoGrid.tsx` | Wymuszenie muted na ThumbnailTile i MiniVideo |
| `src/components/meeting/VideoRoom.tsx` | Filtrowanie lokalnego video w PiP (data-local-video) |

