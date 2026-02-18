

# Naprawa niezawodnego PiP i plynnego udostepniania ekranu

## Problem 1: PiP nie zawsze dziala

`activeVideoRef` wskazuje na element `<video>` glownego mowcy. Gdy kamera jest wylaczona, ten element ma klase `hidden` i moze nie miec wymiarow (width/height = 0). Przegladarka odmawia `requestPictureInPicture()` dla takiego elementu - wymaga widocznego, odtwarzajacego wideo z wymiarami > 0.

### Rozwiazanie

W `VideoRoom.tsx` - handler `visibilitychange`:
1. Sprawdzic czy `activeVideoRef.current` jest uzywalne (ma srcObject, videoWidth > 0)
2. Jesli nie - przeszukac DOM (`document.querySelectorAll('video')`) i znalezc PIERWSZY element video ktory ma stream i wymiary
3. Uzyc tego elementu jako fallback do PiP
4. Dodac retry z krotkim opoznieniem (100ms) jesli pierwsze wywolanie sie nie powiedzie - czasem przeglada rka potrzebuje chwili po zmianie widocznosci

```text
const handleVisibility = async () => {
  if (screenSharePendingRef.current) return;
  if (document.hidden) {
    // Find best video for PiP
    let pipVideo = activeVideoRef.current;
    if (!pipVideo?.srcObject || !pipVideo.videoWidth) {
      // Fallback: find any playing video
      const allVideos = document.querySelectorAll('video');
      pipVideo = Array.from(allVideos).find(v => 
        v.srcObject && v.videoWidth > 0 && !v.paused
      ) || null;
    }
    if (pipVideo && !document.pictureInPictureElement) {
      await pipVideo.requestPictureInPicture();
      ...
    }
  }
};
```

## Problem 2: Udostepnianie ekranu wyrzuca ze spotkania

Mimo flagi `screenSharePendingRef`, picker `getDisplayMedia` moze wywolac `visibilitychange` w momencie PRZED ustawieniem flagi (micro-task timing) lub sam `requestPictureInPicture` moze rzucic blad ktory nie jest prawidlowo obsluzony.

### Rozwiazanie

1. Ustawic `screenSharePendingRef.current = true` WCZESNIEJ - przed calym blokiem try/catch (juz jest, ale upewnic sie)
2. W handlerze `visibilitychange` dodac dodatkowy guard: jesli `isScreenSharing` state jest true lub pending, nie uruchamiac PiP
3. Dodac osobny `catch` w handlerze PiP ktory nie propaguje bledu
4. W `handleToggleScreenShare` - jesli PiP jest aktywne, najpierw je zamknac przed otwarciem pickera

```text
const handleToggleScreenShare = async () => {
  // Exit PiP first to avoid conflicts
  if (document.pictureInPictureElement) {
    try { await document.exitPictureInPicture(); } catch {}
    setIsPiPActive(false);
  }
  screenSharePendingRef.current = true;
  // ... rest of screen share logic
};
```

## Zmieniane pliki

1. **`src/components/meeting/VideoRoom.tsx`**:
   - Handler `visibilitychange` (auto-PiP): fallback na dowolny element video z prawidlowym streamem
   - Handler `handleToggleScreenShare`: zamkniecie PiP przed otwarciem pickera
   - Dodatkowe guardy w handlerze widocznosci (sprawdzenie `isScreenSharing` przez ref)

