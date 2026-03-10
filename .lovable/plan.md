

# Fix: Avatar w głównym oknie + Przełączanie mówcy

## Problem 1: Avatar nie pojawia się w głównym oknie po wyłączeniu kamery

`allParticipants` memo (linia 943-946) nie zawiera `isCameraOff` w obiekcie lokalnego uczestnika ani w tablicy zależności. Choć `isCameraOff` jest przekazywany jako prop do `VideoTile`, brak go w memo powoduje, że obiekt `activeSpeaker` jest niespójny — np. w podrzędnych komponentach które korzystają z `participant.isCameraOff` zamiast propu.

**Fix**: Dodać `isCameraOff` do obiektu lokalnego uczestnika w memo i do tablicy zależności.

```typescript
const allParticipants = useMemo<VideoParticipant[]>(() => [
  { peerId: 'local', displayName: localDisplayName, stream: localStream, isMuted, isCameraOff, isLocal: true, avatarUrl: localAvatarUrl },
  ...participants,
], [localDisplayName, localStream, isMuted, isCameraOff, localAvatarUrl, participants]);
```

## Problem 2: Widok mówcy nie przełącza na aktywnego mówcę

Diagnoza — `useActiveSpeakerDetection` hook tworzy NOWY `AudioContext` (linia 477), który na mobile/PWA może pozostać `suspended` mimo że użytkownik już kliknął "Dołącz". Gesture listenery dodane w efekcie mogą nie odpalić, bo użytkownik nie klika ponownie po mount hooka.

Dodatkowo: efekt ma `[participants]` w deps, co powoduje restart interwału przy każdym broadcast (np. zmiana `isCameraOff` remote'a). To resetuje cykl detekcji.

**Fix A**: Na starcie efektu, jeśli `userHasInteracted` jest true, natychmiast resume AudioContext + odpalić krótki silent audio trick.

**Fix B**: Przenieść `participants` do refa, żeby interwał nie był restartowany przy każdej zmianie stanu uczestników. Efekt uruchomi się tylko raz, a interwał zawsze czyta aktualny stan z refa.

**Fix C**: Obniżyć próg `maxLevel` z 25 do 15 (surowy avg) — 25 jest zbyt wysoki dla cichszych mikrofonów.

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `VideoGrid.tsx` linia 943-946 | Dodać `isCameraOff` do local participant + deps |
| `VideoGrid.tsx` linia 467-588 | Refaktor `useActiveSpeakerDetection`: ref dla participants, lepszy AudioContext resume, niższy próg |

