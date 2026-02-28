

## Naprawa trzech problemow: odwrocona maska, intensywnosc rozmycia, odzyskiwanie polaczenia

### Problem 1: Maska jest odwrocona -- rozmywa mowce zamiast tla

**Przyczyna**: Selfie segmenter MediaPipe ma 2 kategorie: 0=tlo, 1=osoba. Przy `outputConfidenceMasks: true`, `confidenceMasks[0]` daje prawdopodobienstwo ze piksel to **tlo** (nie osoba!).

Obecny kod:
```text
const personMask = masks[0]; // BLEDNIE: to jest maska TLA, nie osoby
if (mask[i] < THRESHOLD) { /* zastap rozmyciem */ }
```

Wartosc bliska 1.0 w `masks[0]` = to jest tlo. Wartosc bliska 0.0 = to nie jest tlo (= osoba).
Warunek `mask[i] < 0.5` trafnie identyfikuje OSOBE i ja rozmywa -- to jest odwrocone!

**Naprawa**: Zmienic na `masks[1]` (confidence osoby) lub odwrocic warunek. Najczytelniej: uzyc `masks[1]` jako person confidence i rozmywac gdy `mask[i] < THRESHOLD` (niska pewnosc ze to osoba = to tlo).

Alternatywnie, prosciiej: zostac przy `masks[0]` (background confidence) ale zmienic warunek na `mask[i] > THRESHOLD` -- gdy wysoka pewnosc ze to tlo, zastap rozmyciem.

Wybieram opcje z `masks[0]` i odwroconym warunkiem (prostsza zmiana, mniej ryzykowna):

```text
// masks[0] = background confidence
// Wysoka wartosc = to jest tlo -> rozmyj
if (mask[i] > THRESHOLD) { /* to tlo -- zastap rozmyciem */ }
```

### Problem 2: Lekkie rozmycie zbyt agresywne, mocne rozmycie za slabe

Obecne wartosci: light=10px, heavy=20px. Roznica jest za mala, a light jest za mocne.

**Naprawa**: Zmienic na light=4px (delikatne, subtelne rozmycie), heavy=25px (wyrazne rozmycie tla). Dodatkowo uzyc miekkiego progu (soft edge) zeby granica miedzy osoba a tlem nie byla ostra -- to poprawi jakosc na mobile.

### Problem 3: Po rozlaczeniu/powrocie polaczenie nie wraca (tlo nie jest ponownie nakladane)

**Przyczyna**: `reacquireLocalStream()` pobiera nowy strumien z kamery ale NIE nakłada ponownie efektu tla (blur/image). Nowy surowy strumien jest wysylany do peerow -- bez rozmycia. Uzytkownik musi recznie wlaczyc/wylaczyc kamerke zeby odzyskac obraz.

**Naprawa**: W `reacquireLocalStream` po uzyskaniu nowego strumienia, sprawdzic czy byl aktywny efekt tla (`bgMode !== 'none'`) i jesli tak -- ponownie nalozyc `applyBackground` na nowy strumien przed wyslaniem go do peerow.

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoBackgroundProcessor.ts` | 1) Odwrocic warunek maski: `mask[i] > THRESHOLD` zamiast `< THRESHOLD` w `applyBlur` i `applyImageBackground`. 2) Zmienic blur radius: light=4px, heavy=25px. 3) Dodac soft edge blending (lerp miedzy progami 0.3-0.7) dla gladszych krawedzi |
| `src/components/meeting/VideoRoom.tsx` | W `reacquireLocalStream`: po uzyskaniu nowego strumienia ponownie nalozyc aktywny efekt tla (applyBackground) |

### Szczegoly techniczne

**VideoBackgroundProcessor.ts -- applyBlur**:
```text
private applyBlur(frame: ImageData, mask: Float32Array, width: number, height: number) {
  const blurRadius = this.mode === 'blur-light' ? 4 : 25;
  const EDGE_LOW = 0.3;
  const EDGE_HIGH = 0.7;
  // mask = background confidence (masks[0])
  // High value = background -> blur
  if (this.blurredCtx && this.blurredCanvas) {
    this.blurredCtx.filter = `blur(${blurRadius}px)`;
    this.blurredCtx.drawImage(this.videoElement, 0, 0, width, height);
    const blurred = this.blurredCtx.getImageData(0, 0, width, height);
    for (let i = 0; i < mask.length; i++) {
      const bgConf = mask[i]; // 1.0 = background, 0.0 = person
      if (bgConf > EDGE_HIGH) {
        // Pure background -> use blurred
        const idx = i * 4;
        frame.data[idx] = blurred.data[idx];
        frame.data[idx + 1] = blurred.data[idx + 1];
        frame.data[idx + 2] = blurred.data[idx + 2];
      } else if (bgConf > EDGE_LOW) {
        // Edge zone -> soft blend
        const alpha = (bgConf - EDGE_LOW) / (EDGE_HIGH - EDGE_LOW);
        const idx = i * 4;
        frame.data[idx] = frame.data[idx] * (1 - alpha) + blurred.data[idx] * alpha;
        frame.data[idx + 1] = frame.data[idx + 1] * (1 - alpha) + blurred.data[idx + 1] * alpha;
        frame.data[idx + 2] = frame.data[idx + 2] * (1 - alpha) + blurred.data[idx + 2] * alpha;
      }
      // bgConf <= EDGE_LOW -> person, keep original
    }
  }
}
```

Ta sama logika (odwrocony warunek + soft edge) w `applyImageBackground`.

**VideoRoom.tsx -- reacquireLocalStream** (dodac po linii z replaceTrack):
```text
// Re-apply background effect if active
if (bgMode !== 'none') {
  try {
    const processedStream = await applyBackground(stream, bgMode, selectedImage);
    if (processedStream !== stream) {
      localStreamRef.current = processedStream;
      setLocalStream(processedStream);
      const processedVideoTrack = processedStream.getVideoTracks()[0];
      if (processedVideoTrack) {
        connectionsRef.current.forEach((conn) => {
          const sender = (conn as any).peerConnection?.getSenders()?.find((s: RTCRtpSender) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(processedVideoTrack);
        });
      }
    }
  } catch (e) {
    console.warn('[VideoRoom] Failed to re-apply background after reacquire:', e);
  }
}
```

### Dlaczego to naprawi wszystkie problemy

- **Odwrocona maska**: Zmiana warunku z `< THRESHOLD` na `> THRESHOLD` sprawia ze rozmycie trafia na tlo (wysoka wartosc masks[0] = tlo) zamiast na osobe
- **Intensywnosc rozmycia**: 4px dla lekkiego daje subtelny efekt; 25px dla mocnego wyraznie rozmywa tlo. Soft edge (lerp 0.3-0.7) eliminuje ostre krawedzie wokol sylwetki
- **Brak powrotu video/audio**: Ponowne nalozenie efektu tla po reacquire gwarantuje ze strumien wysylany do peerow jest prawidlowo przetworzony

