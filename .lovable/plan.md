

# Naprawa: Markery notatek niewidoczne na timeline ukończonej lekcji

## Zdiagnozowany problem

Notatki są zapisywane poprawnie w bazie (potwierdzono: `lesson_id: 7ca6e11b...`, `video_timestamp_seconds: 2`), ale **markery (czerwone kropki) nie pojawiają się na linii czasu**.

### Przyczyna
W pliku `SecureMedia.tsx` istnieją dwa różne tryby renderowania wideo:

| Tryb | Warunek | Player | Markery |
|------|---------|--------|---------|
| Nieukończona lekcja | `disableInteraction = true` | Custom player + `VideoControls` | ✅ Widoczne |
| **Ukończona lekcja** | `disableInteraction = false` | Natywny `<video controls>` | ❌ **Niewidoczne** |

Gdy lekcja jest ukończona, używany jest natywny element `<video>` z atrybutem `controls` (linie 1169-1188), który **nie zawiera komponentu `VideoControls`**, więc markery notatek nigdy nie są renderowane.

---

## Rozwiązanie

Zmienić widok ukończonej lekcji (linie 1169-1188), aby również używał customowego playera z komponentem `VideoControls`, który renderuje markery notatek.

### Szczegóły techniczne

| Plik | Zmiana |
|------|--------|
| `src/components/SecureMedia.tsx` | Zamienić natywny `<video controls>` na custom player z `VideoControls` dla ukończonych lekcji |

### Przed (linie 1169-1188):
```tsx
return (
  <div className={`relative w-full aspect-video bg-black rounded-lg ${className || ''}`}>
    <video
      ref={videoRefCallback}
      src={signedUrl}
      controls                    // ← Natywne kontrolki bez markerów
      controlsList="nodownload"
      className="..."
    />
  </div>
);
```

### Po:
```tsx
return (
  <div className={`relative w-full aspect-video bg-black rounded-lg ${className || ''}`}>
    <div className="relative w-full h-full">
      <video
        ref={videoRefCallback}
        src={signedUrl}
        className="..."
      />
    </div>
    <VideoControls 
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration}
      onPlayPause={handlePlayPause}
      onRewind={handleRewind}
      isFullscreen={isFullscreen}
      onFullscreen={handleFullscreen}
      noteMarkers={noteMarkers}              // ← Markery notatek
      onNoteMarkerClick={onNoteMarkerClick}  // ← Obsługa kliknięcia
    />
  </div>
);
```

---

## Diagram przed/po

```text
PRZED (ukończona lekcja):
┌──────────────────────────────────────────┐
│  <video controls>                        │
│  ┌──────────────────────────────────────┐│
│  │ Natywne kontrolki przeglądarki      ││
│  │ (bez markerów notatek)              ││
│  └──────────────────────────────────────┘│
└──────────────────────────────────────────┘

PO (ukończona lekcja):
┌──────────────────────────────────────────┐
│  <video>                                 │
│  ┌──────────────────────────────────────┐│
│  │ VideoControls                        ││
│  │ ┌──────────────────────────────────┐ ││
│  │ │ Progress bar + czerwone markery  │ ││
│  │ │       ●      ●          ●       │ ││
│  │ └──────────────────────────────────┘ ││
│  └──────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

---

## Kroki implementacji

1. Zlokalizować sekcję renderowania dla ukończonej lekcji (linie 1135-1188)
2. Zamienić natywny `<video controls>` na:
   - Wideo bez `controls`
   - Komponent `VideoControls` z pełnym zestawem propsów (markery, fullscreen, play/pause)
3. Dodać obsługę zdarzeń wideo (play, pause, timeupdate) jeśli brakuje

---

## Oczekiwany efekt

- Czerwone markery notatek będą widoczne na timeline dla ukończonych lekcji
- Kliknięcie markera pokaże toast z treścią notatki
- Kontrolki odtwarzania pozostaną funkcjonalne (play/pause, seek, fullscreen)
- Spójne UX między nieukończonymi i ukończonymi lekcjami

