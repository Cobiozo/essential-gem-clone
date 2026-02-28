
## Naprawa braku dzwieku od innych uczestnikow na urzadzeniach mobilnych

### Przyczyna glowna

Na urzadzeniach mobilnych (szczegolnie iOS Safari i Chrome Android) przegladarki blokuja automatyczne odtwarzanie wideo z dzwiekiem (`autoplay` z `muted={false}`) do momentu interakcji uzytkownika. 

W kodzie `VideoGrid.tsx` elementy `<video>` dla zdalnych uczestnikow maja `muted={participant.isLocal}` -- czyli `muted={false}` dla zdalnych. Odtwarzanie uruchamiane jest przez:
```text
videoRef.current.play().catch(() => {});
```

Problem: `.catch(() => {})` polyka blad autoplay policy **bez zadnego komunikatu**. Na mobile `play()` jest odrzucane, wiec:
- Wideo zdalnych uczestnikow nie odtwarza sie wcale
- Uzytkownik nic nie slyszy i nie dostaje informacji o problemie

Dodatkowo `AudioContext` (uzywany do speaker detection) tez probuje `resume()` bez gwarancji ze jest w kontekscie user gesture.

### Rozwiazanie

Dwuetapowe podejscie:

**Etap 1: Unlock audio na user gesture w VideoRoom**

Dodanie globalnego "audio unlock" mechanizmu ktory:
- Przy pierwszym kliknieciu/dotyknieciu w VideoRoom tworzy krotki cichy AudioContext i go resume'uje
- To odblokowuje audio policy przegladarki dla calej strony
- Listener usuwany po pierwszym uzyciu

**Etap 2: Retry play() z fallbackiem**

W `VideoGrid.tsx` zmiana wszystkich `play().catch(() => {})` na inteligentna logike:

1. Proba `play()` z dzwiekiem (muted=false)
2. Jesli blad -- proba `play()` z `muted=true` + ustawienie flagi "audio zablokowany"  
3. Jesli flaga aktywna -- wyswietlenie banneru/przycisku "Dotknij aby wlaczyc dzwiek" w VideoRoom
4. Po kliknieciu banneru -- odmutowanie wszystkich zdalnych video i ponowne `play()`

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoGrid.tsx` | Zmiana `play().catch(() => {})` na retry z muted fallback; dodanie callbacku `onAudioBlocked` |
| `src/components/meeting/VideoRoom.tsx` | Dodanie audio unlock na user gesture; banner "Dotknij aby wlaczyc dzwiek"; logika odmutowania video po tapnieciu |

### Szczegoly techniczne

#### VideoGrid.tsx -- zmiana play logic (3 miejsca: MainTile linia 71, ThumbnailTile linia 144, MiniVideo linia 388)

Zamiast:
```text
videoRef.current.play().catch(() => {});
```

Nowa logika:
```text
const playVideo = async (video: HTMLVideoElement, isLocal: boolean) => {
  if (isLocal) { video.play().catch(() => {}); return; }
  try {
    await video.play();
  } catch {
    // Autoplay z audio zablokowany -- mutuj i odtworz
    video.muted = true;
    try {
      await video.play();
      onAudioBlocked?.(); // callback do VideoRoom
    } catch { /* nawet muted nie dziala */ }
  }
};
```

Dodanie propa `onAudioBlocked?: () => void` do `VideoGridProps`.

#### VideoRoom.tsx -- audio unlock + banner

1. **Audio unlock listener** (dodany w useEffect init):
```text
const unlockAudio = () => {
  const ctx = new AudioContext();
  ctx.resume().then(() => ctx.close());
  // Odmutuj wszystkie zdalne video
  document.querySelectorAll('video').forEach(v => {
    if (!v.muted) return; // juz gra
    // ... odmutuj jesli to zdalne video
  });
  document.removeEventListener('touchstart', unlockAudio);
  document.removeEventListener('click', unlockAudio);
};
document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('click', unlockAudio, { once: true });
```

2. **Stan `audioBlocked`** -- ustawiany przez callback z VideoGrid
3. **Banner UI** -- gdy `audioBlocked === true`:
```text
<button onClick={handleUnmuteAll}
  className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-full animate-pulse">
  🔇 Dotknij aby włączyć dźwięk
</button>
```
4. **handleUnmuteAll** -- przechodzi po wszystkich `<video>` w DOM, ustawia `muted = false`, wywoluje `play()`, zamyka banner

### Dlaczego to zadziala

- Klikniecie "Dolacz" w lobby jest user gesture -- ale `getUserMedia` i PeerJS setup sa async, wiec do momentu gdy przychodzi zdalny stream, gesture juz nie obowiazuje
- Banner "Dotknij aby wlaczyc dzwiek" daje nowy user gesture w kontekscie juz istniejacego video elementu
- Muted fallback zapewnia ze przynajmniej wideo jest widoczne nawet jesli audio jest zablokowane
- Audio unlock listener na touchstart/click probuje odblokac audio jak najwczesniej
