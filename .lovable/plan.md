

# Naprawa: fałszywe "kamera się zawiesiła" na mobile + niedziałający tryb mówcy

## Problem 1: Fałszywe "kamera się zawiesiła" na mobile/PWA

**Przyczyna**: Detektor zamrożenia kamery (linia 160 VideoRoom.tsx) szuka elementu DOM `video[data-local-video="true"]` **jednorazowo** przy montowaniu efektu. Gdy użytkownik przełącza widok (np. na multi-speaker), React odmontowuje stary `<video>` i montuje nowy. Stary element DOM przestaje produkować klatki → `requestVideoFrameCallback` nie jest już wywoływany → `frameCounter` stoi w miejscu → po 6s pojawia się fałszywy toast "Kamera się zawiesiła".

**Rozwiązanie**: Zamiast szukać elementu DOM raz, użyć `MutationObserver` lub prościej — monitorować `localStream` bezpośrednio przez jego track (bez DOM). Można użyć `requestVideoFrameCallback` na **dowolnym** aktualnie istniejącym `video[data-local-video="true"]`, odpytując go w interwale zamiast raz na początku. Alternatywnie — sprawdzać `readyState` tracku wideo strumienia zamiast polegać na DOM.

**Zmiana**: W useEffect freeze detection, zamiast jednorazowego `querySelector`, w interwale 3s dynamicznie szukać `video[data-local-video="true"]` i porównywać `currentTime` lub użyć fallbacku opartego na `track.readyState` + `track.muted`. Na mobile zrezygnować z requestVideoFrameCallback (jest zawodny) i użyć porównania `video.currentTime`.

## Problem 2: Tryb "mówca" nie przełącza widoku na aktywnego mówcę

**Przyczyna**: `useActiveSpeakerDetection` (VideoGrid.tsx:349) tworzy analysery audio w useEffect z zależnością `[participants]`. Problem: referencja tablicy `participants` zmienia się przy każdym renderze (nowy array). Ale kluczowe — analysery tworzy się przez `ctx.createMediaStreamSource(p.stream)`, co wymaga działającego `AudioContext`. Na mobile AudioContext jest `suspended` do pierwszego gestu. `ctx.resume()` na liniach 362-364 jest wywołane, ale jego wynik jest ignorowany (`.catch(() => {})`). Jeśli resume się nie powiedzie, analysery nigdy nie dostarczą danych audio → `speakingIndex` zawsze -1 → widok zawsze pokazuje uczestnika o indeksie 1 (fallback z linii 802-803).

Dodatkowo na desktop: histereza na liniach 423-428 wymaga, by nowy mówca był o **0.15** głośniejszy od poprzedniego. Przy słabszych mikrofonach lub podobnym poziomie głośności, przełączenie może nigdy nie nastąpić.

**Rozwiązanie**: 
1. Poczekać na `ctx.resume()` przed tworzeniem analyserów (await + state tracking)
2. Obniżyć próg histerezji z 0.15 do 0.08
3. Na mobile: dodać listener na `click/touchstart` do resume AudioContext jeśli nadal suspended

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/meeting/VideoRoom.tsx` | Freeze detection: dynamicznie szukać video elementu w interwale zamiast raz; na mobile porównywać `video.currentTime` zamiast requestVideoFrameCallback |
| `src/components/meeting/VideoGrid.tsx` | Speaker detection: await `ctx.resume()` + user gesture listener; obniżyć próg histerezji; dodać fallback resume na touch |

## Szczegóły techniczne

### VideoRoom.tsx — freeze detection (linie 152-221)

```typescript
// Zamiast jednorazowego querySelector + requestVideoFrameCallback:
freezeCheckInterval = setInterval(() => {
  if (document.hidden) return;
  
  // Dynamicznie szukaj aktualnego elementu video
  const videoEl = document.querySelector('video[data-local-video="true"]') as HTMLVideoElement | null;
  if (!videoEl || !localStreamRef.current) {
    frozenChecks = 0;
    return;
  }
  
  const currentTime = videoEl.currentTime;
  if (currentTime === lastTime && currentTime > 0) {
    frozenChecks++;
  } else {
    frozenChecks = 0;
  }
  lastTime = currentTime;
  
  if (frozenChecks >= 2) { // 6s
    frozenChecks = 0;
    // Dodatkowa weryfikacja: sprawdź czy track jest żywy
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track || track.readyState === 'ended' || track.muted) {
      // Prawdziwy freeze
      if (isMobilePWA) { toast(...) } else { reacquireLocalStream() }
    }
    // Jeśli track żywy — to fałszywy alarm (zmiana layoutu), ignoruj
  }
}, 3000);
```

### VideoGrid.tsx — speaker detection (linie 349-454)

```typescript
// W useEffect na liniach 356-438:
const ctx = audioContextRef.current;
if (ctx.state === 'suspended') {
  // Await resume + register gesture listener
  ctx.resume().catch(() => {});
  const resumeOnGesture = () => {
    ctx.resume().catch(() => {});
    document.removeEventListener('click', resumeOnGesture);
    document.removeEventListener('touchstart', resumeOnGesture);
  };
  document.addEventListener('click', resumeOnGesture, { once: true });
  document.addEventListener('touchstart', resumeOnGesture, { once: true });
}

// Linia 428: obniżyć próg
if (newLevel > prevLevel + 0.08 || prevLevel < 0.05) {
```

