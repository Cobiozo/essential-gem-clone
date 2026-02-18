

# Naprawa czatu w spotkaniu i kompatybilnosc z iOS/Safari

## 1. Wiadomosci czatu zaczynajace sie od dolu

**Problem**: Mimo uzycia `flex flex-col justify-end`, wiadomosci pojawiaja sie na gorze panelu czatu, poniewaz viewport ScrollArea nie rozciaga sie na pelna wysokosc kontenera.

**Plik**: `src/components/meeting/MeetingChat.tsx` (linia 187-188)

**Rozwiazanie**: Zastapienie `ScrollArea` natywnym kontenerem z `overflow-y-auto` i Flexbox `justify-end`, ktory poprawnie wyrownuje tresc do dolu. ScrollArea Radix nie propaguje `min-height` do viewportu, co powoduje problem.

```
// Przed:
<ScrollArea className="flex-1 px-3 py-2">
  <div className="space-y-3 min-h-full flex flex-col justify-end">

// Po:
<div className="flex-1 overflow-y-auto px-3 py-2">
  <div className="space-y-3 min-h-full flex flex-col justify-end">
    ...
  </div>
</div>
```

---

## 2. Kompatybilnosc z iOS/Mac Safari - dolaczanie do spotkan

**Pliki**: `MeetingLobby.tsx`, `VideoRoom.tsx`, `VideoGrid.tsx`

### a) Bezpieczne getUserMedia z fallbackiem (MeetingLobby + VideoRoom)

Safari moze odrzucic `getUserMedia({ video: true, audio: true })` jesli np. kamera jest zablokowana. Dodanie fallbacku: proba audio+video, jesli fail -> proba samego audio, jesli fail -> proba samego video.

```typescript
// Zamiast:
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

// Nowa logika:
let stream: MediaStream;
try {
  stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
} catch {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
  }
}
```

### b) Atrybuty video dla iOS (VideoGrid.tsx)

Dodanie `webkit-playsinline` i obslugi `play()` po ustawieniu `srcObject` (Safari wymaga tego dla autoplay):

```typescript
useEffect(() => {
  if (videoRef.current && participant.stream) {
    videoRef.current.srcObject = participant.stream;
    // Safari requires explicit play() after srcObject assignment
    videoRef.current.play().catch(() => {});
  }
}, [participant.stream]);
```

### c) AudioContext resume na iOS

Safari blokuje AudioContext do interakcji uzytkownika. Dodanie `resume()` w hookach detekcji mowcy (juz jest, ale trzeba powtorzyc w init).

### d) Wylaczenie getDisplayMedia na mobilnym Safari

`getDisplayMedia` nie jest obslugiwane na iOS Safari. Ukrycie przycisku "Ekran" gdy `navigator.mediaDevices.getDisplayMedia` nie istnieje:

```typescript
// W MeetingControls - dodanie warunku
const canShareScreen = typeof navigator.mediaDevices?.getDisplayMedia === 'function';
```

### e) PiP - wylaczenie na iOS Safari

PiP API jest niepelne na iOS Safari. Dodanie sprawdzenia:

```typescript
const isPiPSupported = typeof document !== 'undefined' 
  && 'pictureInPictureEnabled' in document 
  && document.pictureInPictureEnabled
  && !/iPad|iPhone|iPod/.test(navigator.userAgent);
```

---

## 3. Responsywnosc mobilna spotkan

**Plik**: `MeetingControls.tsx`

### a) Kontrolki na malych ekranach

Dodanie `flex-wrap` i zmniejszenie gap na mobile aby kontrolki nie wylewaly sie poza ekran:

```
className="flex items-center justify-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 bg-zinc-900 border-t border-zinc-800 flex-wrap"
```

### b) Czat mobilny - pelnoekranowy overlay

Juz zaimplementowane (`max-md:absolute max-md:inset-0`), ale dodanie `safe-area-inset` dla iOS:

```
className="w-80 max-md:absolute max-md:inset-0 max-md:w-full max-md:z-50"
// + dodanie paddingu env(safe-area-inset-bottom) do inputu czatu
```

### c) Touch-friendly kontrolki

Minimalne rozmiary przyciskow juz sa 44px (w-11 h-11 = 44px), zgodne z wytycznymi.

---

## Podsumowanie zmian w plikach

| Plik | Zmiana |
|------|--------|
| `MeetingChat.tsx` | ScrollArea -> natywny overflow, wiadomosci od dolu |
| `MeetingLobby.tsx` | getUserMedia z fallbackiem |
| `VideoRoom.tsx` | getUserMedia z fallbackiem, lepsza obsluga bledow |
| `VideoGrid.tsx` | Jawne play() po srcObject, webkit-playsinline |
| `MeetingControls.tsx` | Ukrycie ekranu na iOS, flex-wrap, safe-area |

