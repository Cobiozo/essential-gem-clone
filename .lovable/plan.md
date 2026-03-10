

# Fix: fałszywy przycisk "Dotknij aby włączyć dźwięk" + echo w trybie Mówca/Wielu mówców

## Diagnoza

### Echo (słychać siebie)

**Przyczyna**: W VideoRoom.tsx jest globalny handler `unlockAudio` (linia 368-381) uruchamiany przy każdym touch/click, który odmucza WSZYSTKIE elementy `<video>` z wyjątkiem tych oznaczonych `data-local-video="true"`. 

Problem: atrybut `data-local-video="true"` jest ustawiony **tylko** w `VideoTile` (linia 242). Elementy `ThumbnailTile`, `MiniVideo` i `DraggableFloatingPiP` **nie mają** tego atrybutu, mimo że mogą renderować lokalny strumień.

Efekt:
- **Galeria**: używa tylko `VideoTile` (ma `data-local-video`) → lokalny element poprawnie pomijany → brak echa ✓
- **Mówca**: lokalny użytkownik renderowany jako `ThumbnailTile` (brak `data-local-video`) → `unlockAudio` odmucza go → echo ✗
- **Wielu mówców**: lokalny może być jako `MiniVideo` (brak `data-local-video`) → ten sam problem ✗

### Przycisk "Dotknij aby włączyć dźwięk"

**Przyczyna**: Przy zmianie widoku, React odmontowuje i montuje nowe `VideoTile`. Nowe elementy wywołują `playVideoSafe`, które na mobile może chwilowo napotkać błąd autoplay (transient). Fallback mutuje i woła `onAudioBlocked()`, co ustawia `audioBlocked=true` i pokazuje przycisk — mimo że użytkownik już wcześniej wchodził w interakcję ze stroną.

## Plan naprawy

### 1. Dodanie `data-local-video` do wszystkich komponentów video (VideoGrid.tsx)

Dodać `data-local-video={participant.isLocal ? 'true' : undefined}` do elementów `<video>` w:
- `ThumbnailTile` (linia 332-337)
- `MiniVideo` (linia 607)
- `DraggableFloatingPiP` (linia 681-686)

### 2. Sprawdzenie `userHasInteracted` w `playVideoSafe` (VideoGrid.tsx)

Przed wywołaniem `onAudioBlocked?.()` sprawdzić `userHasInteracted`. Jeśli użytkownik już wchodził w interakcję, nie triggerować bannera — to chwilowy problem z remountem, nie prawdziwy blok autoplay.

```typescript
// W playVideoSafe, linia 66:
if (!userHasInteracted) {
  onAudioBlocked?.();
}
```

### Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/meeting/VideoGrid.tsx` | Dodać `data-local-video` do ThumbnailTile, MiniVideo, DraggableFloatingPiP; guard `onAudioBlocked` w `playVideoSafe` |

