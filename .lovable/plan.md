

## Naprawa: Mobile nie słyszy desktop (jednokierunkowy problem audio)

### Przyczyna

W `VideoRoom.tsx` linia 177, handler `unlockAudio` sprawdza warunek:
```
if (video.paused && video.srcObject && ...)
```

Problem: gdy `playVideoSafe` nie moze odtworzyc z dzwiekiem (autoplay policy na mobile), ustawia `video.muted = true` i odtwarza wyciszone. Video NIE jest `paused` (gra, ale muted). Handler `unlockAudio` szuka tylko `paused` video, wiec pomija wyciszone -- video pozostaje muted na zawsze.

Desktop nie ma tego problemu, bo autoplay z dzwiekiem jest dozwolone na desktopie.

### Rozwiazanie

**Plik: `src/components/meeting/VideoRoom.tsx`** (linia 175-181)

Zmienic warunek w unlockAudio, aby odblokwywac takze video ktore gra ale jest wyciszone (muted):

```text
// PRZED (blad):
document.querySelectorAll('video').forEach((v) => {
  const video = v as HTMLVideoElement;
  if (video.paused && video.srcObject && video.getAttribute('data-local-video') !== 'true') {
    video.muted = false;
    video.play().catch(() => {});
  }
});

// PO (poprawka):
document.querySelectorAll('video').forEach((v) => {
  const video = v as HTMLVideoElement;
  if (video.srcObject && video.getAttribute('data-local-video') !== 'true') {
    if (video.paused) {
      video.muted = false;
      video.play().catch(() => {});
    } else if (video.muted) {
      // Video gra wyciszone (autoplay fallback) - odblokuj dzwiek
      video.muted = false;
    }
  }
});
```

### Dlaczego to naprawi problem

Kazde dotknięcie ekranu na mobile teraz:
1. Odblokuje wstrzymane (paused) zdalne video -- jak wczesniej
2. NOWE: Odblokuje wyciszone (muted) ale grajace zdalne video -- naprawa glownego bugu

Desktop nie jest dotkniety ta zmiana, bo tam autoplay dziala bez wyciszenia.

### Plik do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoRoom.tsx` | Linia 175-181: rozszerzyc warunek unlockAudio o muted (nie tylko paused) video |

