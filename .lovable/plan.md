

## Naprawa PiP: pokazuje lokalne video zamiast zdalnego mowcy

### Przyczyna

W `handleTogglePiP` i auto-PiP (`handleVisibility`), logika najpierw sprawdza `activeVideoRef.current`. Ten ref jest ustawiany przez VideoGrid na aktywnego mowce -- ale gdy uzytkownik jest sam lub jest "aktywny" (np. w speaker mode z indeksem 0), ref wskazuje na LOKALNE video. Warunek `!pipVideo?.srcObject || !pipVideo.videoWidth` NIE sprawdza czy to lokalne video, wiec przechodzi bezposrednio do `requestPictureInPicture()` z lokalnym obrazem.

Filtr `data-local-video !== 'true'` istnieje tylko w fallbacku (gdy activeVideoRef jest stale), ale nigdy nie jest stosowany do samego `activeVideoRef.current`.

### Rozwiazanie

**Plik: `src/components/meeting/VideoRoom.tsx`**

Zmienic warunek sprawdzajacy `activeVideoRef.current` -- dodac weryfikacje czy to nie jest lokalne video (chyba ze nie ma zadnych zdalnych uczestnikow):

**handleTogglePiP (linia 1426-1434):**
```text
let pipVideo: HTMLVideoElement | null = activeVideoRef.current;

// Odrzuc activeVideoRef jesli to lokalne video (chyba ze jestesmy sami)
const hasRemoteParticipants = remoteParticipants.length > 0;
if (pipVideo?.getAttribute('data-local-video') === 'true' && hasRemoteParticipants) {
  pipVideo = null; // wymus fallback do zdalnego video
}

if (!pipVideo?.srcObject || !pipVideo.videoWidth) {
  const allVideos = document.querySelectorAll('video');
  pipVideo = Array.from(allVideos).find(
    v => v.srcObject && v.videoWidth > 0 && !v.paused && v.getAttribute('data-local-video') !== 'true'
  ) || (hasRemoteParticipants ? null : Array.from(allVideos).find(
    v => v.srcObject && v.videoWidth > 0 && !v.paused
  )) || null;
}
```

**Auto-PiP handleVisibility (linia 1459-1467):**
Identyczna zmiana -- odrzucic lokalne video z activeVideoRef gdy sa zdalni uczestnicy, i w fallbacku nie wracac do lokalnego video jesli sa zdalni.

### Dokladne zmiany

| Miejsce | Zmiana |
|---------|--------|
| handleTogglePiP (linia 1426) | Dodac sprawdzenie `data-local-video` na activeVideoRef + `remoteParticipants.length` |
| handleVisibility (linia 1459) | Analogiczna zmiana |
| Fallback w obu miejscach | Usunac ostatni fallback (ktory lapie dowolne video) gdy sa zdalni uczestnicy |

### Potrzebna zmienna

Zmienna `remoteParticipants` jest juz dostepna w komponencie (linia ~220-230 lub stan). Nalezy zweryfikowac jej dokladna nazwe w kodzie.

