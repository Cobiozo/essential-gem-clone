
# Naprawa: Usunięcie markerów notatek i przywrócenie natywnych kontrolek

## Problem

1. **Ukończone lekcje** - używają custom `VideoControls` zamiast natywnych kontrolek HTML5
2. **Markery notatek** - nakładają się na pasek postępu i powodują problemy wizualne

## Rozwiązanie

Usunąć markery notatek z całego systemu i przywrócić prawidłowe działanie:

### Zmiany w `src/components/SecureMedia.tsx`

| Lokalizacja | Zmiana |
|-------------|--------|
| **Nieukończone lekcje** (linie 1104-1130) | Usunąć propsy `noteMarkers` i `onNoteMarkerClick` z VideoControls |
| **Ukończone lekcje** (linie 1169-1207) | Przywrócić `<video controls>` z natywnymi kontrolkami, usunąć `<VideoControls>` |

### Zmiany w `src/components/training/VideoControls.tsx`

| Zmiana |
|--------|
| Usunąć interface `NoteMarker` |
| Usunąć propsy `noteMarkers` i `onNoteMarkerClick` |
| Usunąć sekcję renderowania czerwonych kropek na pasku postępu (linie 217-232) |

## Kod po zmianach

### Ukończone lekcje - przywrócone natywne kontrolki:
```tsx
// Linie 1169-1207 - powrót do oryginalnego kodu
return (
  <div className={`relative w-full aspect-video bg-black rounded-lg ${className || ''}`}>
    <video
      ref={videoRefCallback}
      {...securityProps}
      src={signedUrl}
      controls                    // ← Natywne kontrolki HTML5
      controlsList="nodownload"
      className="absolute inset-0 w-full h-full object-contain rounded-lg"
      preload="metadata"
      playsInline
      webkit-playsinline="true"
      {...(signedUrl.includes('supabase.co') && { crossOrigin: "anonymous" })}
    >
      Twoja przeglądarka nie obsługuje odtwarzania wideo.
    </video>
  </div>
);
```

### Nieukończone lekcje - VideoControls bez markerów:
```tsx
<VideoControls
  isPlaying={isPlaying}
  currentTime={currentTime}
  duration={duration}
  onPlayPause={handlePlayPause}
  onRewind={handleRewind}
  // ... pozostałe propsy
  // USUNIĘTE: noteMarkers, onNoteMarkerClick
/>
```

## Notatki - co pozostaje działające

| Funkcjonalność | Status |
|----------------|--------|
| Dodawanie notatek z timestampem | ✅ Działa |
| Lista notatek w dialogu | ✅ Działa |
| Timestamp przy notatce (np. "2:35") | ✅ Działa |
| Skok do miejsca w wideo po kliknięciu timestampa | ✅ Działa (tylko ukończone lekcje) |
| Eksport notatek | ✅ Działa |
| Czerwone markery na pasku | ❌ Usunięte |

## Szczegóły techniczne

| Plik | Zakres zmian |
|------|--------------|
| `src/components/SecureMedia.tsx` | Linie 1104-1130: usunięcie 2 propsów; Linie 1169-1207: przywrócenie oryginalnego kodu z `controls` |
| `src/components/training/VideoControls.tsx` | Usunięcie interface NoteMarker, 2 propsów i sekcji renderowania markerów |

## Oczekiwany efekt

- Ukończone lekcje mają pełne natywne kontrolki HTML5
- Brak nakładających się elementów UI
- Notatki działają przez dedykowany przycisk i dialog
- Zachowana możliwość skoku do timestampa z listy notatek
