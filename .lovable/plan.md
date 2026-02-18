

# Naprawa kamery i udostepniania ekranu

## Problem 1: Kamera nie wraca po wlaczeniu

Gdy kamera jest wylaczona, element `<video>` jest usuwany z DOM i zastepowany awatarem. Gdy uzytkownik wlacza kamere ponownie, React tworzy NOWY element `<video>`, ale `useEffect` ktory ustawia `srcObject` zalezy od `participant.stream` - jesli React batch'uje aktualizacje stanu (`isCameraOff` + `localStream`), efekt moze nie uruchomic sie po zamontowaniu nowego elementu video.

### Rozwiazanie

W `VideoGrid.tsx` - VideoTile:
- Zmienic z warunkowego renderowania `<video>` na stale renderowanie elementu video z `hidden` class gdy kamera wylaczona
- Dzieki temu element `<video>` nigdy nie jest usuwany z DOM, `srcObject` pozostaje ustawiony
- Gdy kamera wraca - wystarczy usunac `hidden`, obraz jest natychmiast widoczny

```text
Zamiast:
  {showVideo ? <video .../> : <avatar/>}
  {!showVideo && stream && <video hidden/>}

Bedzie:
  <video ref={videoRef} ... className={showVideo ? '...' : 'hidden'} />
  {!showVideo && <avatar/>}
```

## Problem 2: Udostepnianie ekranu wyrzuca ze spotkania

Gdy `getDisplayMedia()` otwiera picker przegladarki, `document.hidden` moze stac sie `true`. To uruchamia handler auto-PiP (linia 417), ktory probuje wywolac `requestPictureInPicture()` na elemencie video. Jesli to sie nie powiedzie lub koliduje z trwajacym `getDisplayMedia`, moze spowodowac kaskade bledow.

### Rozwiazanie

W `VideoRoom.tsx`:
- Dodac flage `isScreenSharePending` (useRef) ustawiana na `true` PRZED wywolaniem `getDisplayMedia` i na `false` po zakonczeniu
- W handlerze `visibilitychange` (auto-PiP) sprawdzac te flage - jesli `true`, nie uruchamiac PiP
- Dodatkowo: owinac `getDisplayMedia` w lepszy try/catch ktory nie powoduje efektow ubocznych w razie anulowania przez uzytkownika

```text
W handleToggleScreenShare:
  screenSharePendingRef.current = true;
  try {
    const screenStream = await getDisplayMedia(...);
    ...
  } catch { ... }
  finally { screenSharePendingRef.current = false; }

W handleVisibility (auto-PiP):
  if (screenSharePendingRef.current) return; // nie uruchamiaj PiP
```

## Zmieniane pliki

1. **`src/components/meeting/VideoGrid.tsx`** - VideoTile: stale renderowanie elementu video (nie usuwac z DOM przy wylaczonej kamerze)
2. **`src/components/meeting/VideoRoom.tsx`** - flaga screenSharePending blokujaca auto-PiP podczas pickera, lepszy error handling w screen share

