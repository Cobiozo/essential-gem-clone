
# Naprawa PiP i przycinania obrazu w Meeting Room

## Problem 1: Obraz glowny jest za duzy i obcina mowiacego

**Przyczyna:** Mimo ustawienia `object-contain` na elemencie video, klasy `w-full h-full` wymuszaja rozciagniecie video do pelnego rozmiaru kontenera. W polaczeniu z `overflow-hidden` na rodzicu, video moze byc przycinane gdy proporcje kamery nie pasuja do ekranu.

**Naprawa w `VideoGrid.tsx`:**
- Zmienic klasy video z `w-full h-full object-contain` na `max-w-full max-h-full object-contain`
- Kontener juz ma `flex items-center justify-center`, wiec video bedzie wycentrowane z czarnymi pasami po bokach/gorze
- Dotyczy glownego VideoTile (linia 55)

## Problem 2: PiP nie uruchamia sie automatycznie przy zmianie karty

**Przyczyna:** PiP dziala tylko po recznym kliknieciu przycisku. Brak nasluchiwania na `visibilitychange` ktore automatycznie wlaczaloby PiP gdy uzytkownik przechodzi na inna karte.

**Naprawa w `VideoRoom.tsx`:**
- Dodac `useEffect` z listenerem `visibilitychange`
- Gdy `document.hidden === true` i jest aktywny element video z streamem -> automatycznie wejsc w PiP
- Gdy uzytkownik wraca na karte (`document.hidden === false`) -> automatycznie wyjsc z PiP
- Uwzglednic warunek `isPiPSupported`
- Dodac ref do sledzenia czy PiP zostal wlaczony automatycznie (zeby nie wychodz z PiP wlaczonego recznie przez uzytkownika przy powrocie na karte)

## Zmieniane pliki

### 1. `src/components/meeting/VideoGrid.tsx`
- Linia 55: zmienic `w-full h-full object-contain` na `max-w-full max-h-full object-contain`

### 2. `src/components/meeting/VideoRoom.tsx`
- Dodac nowy `useEffect` (okolo linii 393) z listenerem `visibilitychange`:

```typescript
useEffect(() => {
  if (!isPiPSupported) return;
  const autoPiPRef = { current: false };

  const handleVisibility = async () => {
    try {
      if (document.hidden) {
        // Tab hidden -> enter PiP
        if (!document.pictureInPictureElement && activeVideoRef.current && activeVideoRef.current.srcObject) {
          await activeVideoRef.current.requestPictureInPicture();
          autoPiPRef.current = true;
          setIsPiPActive(true);
        }
      } else {
        // Tab visible -> exit PiP only if auto-entered
        if (document.pictureInPictureElement && autoPiPRef.current) {
          await document.exitPictureInPicture();
          autoPiPRef.current = false;
          setIsPiPActive(false);
        }
      }
    } catch (err) {
      console.warn('[VideoRoom] Auto PiP error:', err);
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [isPiPSupported]);
```
