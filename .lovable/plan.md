
# Plan: Bezpieczne kontrolki wideo dla Aktualności

## Zdiagnozowane problemy

| Problem | Lokalizacja | Wpływ |
|---------|-------------|-------|
| Natywne kontrolki wideo | `SecureMedia.tsx` (linia 1202) | Możliwość pobierania przez menu kontekstowe przeglądarki |
| Brak flagi `disableInteraction` w CMSContent | `CMSContent.tsx` (linia 47-52) | Wideo używa domyślnego trybu z natywnymi kontrolkami |
| Brak kontrolki prędkości w VideoControls | `VideoControls.tsx` | Brak możliwości zmiany prędkości odtwarzania |
| Brak paska postępu klikanego | `VideoControls.tsx` | Użytkownik nie może precyzyjnie przesuwać wideo |

## Analiza obecnej architektury

```text
SecureMedia.tsx
├── disableInteraction = true  → VideoControls (custom, bez download)
│   └── Play/Pause, Rewind, Progress (only view), Fullscreen
│   └── BRAK: Seek, Speed control
│
└── disableInteraction = false → Native <video controls>
    └── Wszystkie funkcje natywne + MOŻLIWE POBIERANIE
```

## Wymagania dla Aktualności

✅ Play / Pause
✅ Przesuwanie (seek) po całym wideo
✅ Zmiana prędkości (0.5x, 1x, 1.5x, 2x)
✅ Pełny ekran
✅ Pasek postępu (klikacie = skok)
❌ BRAK pobierania
❌ BRAK menu kontekstowego na wideo

## Propozycja rozwiązania

### Nowy parametr dla SecureMedia

Dodać nową opcję `controlMode` z trzema trybami:

| Tryb | Opis | Użycie |
|------|------|--------|
| `'native'` | Natywne kontrolki (obecne zachowanie) | Domyślny (kompatybilność) |
| `'restricted'` | VideoControls bez seek/speed (obecny `disableInteraction`) | Szkolenia (podczas oglądania) |
| `'secure'` | **NOWY** - Pełne kontrolki bez pobierania | Aktualności, Zdrowa Wiedza |

---

## Sekcja techniczna

### 1. Nowy plik: `src/components/training/SecureVideoControls.tsx`

Nowy komponent kontrolek z pełną funkcjonalnością:

```typescript
interface SecureVideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;        // NOWE
  onSpeedChange: (rate: number) => void; // NOWE
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onRetry?: () => void;
  isBuffering?: boolean;
}
```

Funkcje:
- Pasek postępu klikacie (onClick → seek)
- Dropdown prędkości (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
- Play/Pause, Fullscreen
- Skip ±10s przyciski
- Wyświetlanie czasu

### 2. Modyfikacja: `src/components/SecureMedia.tsx`

**Nowy prop:**
```typescript
interface SecureMediaProps {
  // ... istniejące props
  controlMode?: 'native' | 'restricted' | 'secure'; // NOWE
}
```

**Logika renderowania wideo:**
```typescript
if (mediaType === 'video') {
  // YouTube - bez zmian
  if (isYouTube) { ... }
  
  // Tryb restricted (szkolenia) - istniejąca logika
  if (controlMode === 'restricted' || disableInteraction) {
    return ( /* VideoControls - obecna implementacja */ );
  }
  
  // NOWY: Tryb secure (aktualności)
  if (controlMode === 'secure') {
    return (
      <div ref={containerRef}>
        <video
          ref={videoRef}
          src={signedUrl}
          controls={false}
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          {...securityProps}
        />
        <SecureVideoControls
          videoRef={videoRef}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onSpeedChange={handleSpeedChange}
          onFullscreen={handleFullscreen}
          isFullscreen={isFullscreen}
        />
      </div>
    );
  }
  
  // Tryb native (domyślny) - istniejąca logika
  return ( /* <video controls> */ );
}
```

**Nowe handlery:**
```typescript
const handleSeek = useCallback((time: number) => {
  if (videoRef.current) {
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }
}, []);

const handleSpeedChange = useCallback((rate: number) => {
  if (videoRef.current) {
    videoRef.current.playbackRate = rate;
  }
}, []);
```

### 3. Modyfikacja: `src/components/CMSContent.tsx`

Przekazanie `controlMode="secure"` dla wideo w aktualnościach:

```typescript
const renderMedia = () => {
  if (!item.media_url || !item.media_type) return null;
  
  return (
    <SecureMedia
      mediaUrl={item.media_url}
      mediaType={item.media_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
      altText={item.media_alt_text || item.title || 'Zabezpieczone media'}
      className="w-full max-w-md mx-auto shadow-lg mb-4"
      controlMode={item.media_type === 'video' ? 'secure' : undefined}  // NOWE
    />
  );
};
```

### 4. Wzmocnienie zabezpieczeń w SecureMedia

Dodanie blokady pobierania przez JavaScript:

```typescript
// W useEffect dla wideo
useEffect(() => {
  if (!videoElement) return;
  
  // Block download attempts via keyboard
  const handleKeyDown = (e: KeyboardEvent) => {
    // Block Ctrl+S on video
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
    }
  };
  
  videoElement.addEventListener('keydown', handleKeyDown);
  return () => videoElement.removeEventListener('keydown', handleKeyDown);
}, [videoElement]);
```

---

## Wygląd nowych kontrolek (SecureVideoControls)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                          [WIDEO]                                           │
├────────────────────────────────────────────────────────────────────────────┤
│  ▶ Play   -10s   +10s   [░░░░████████░░░░░░░░]   1:23 / 5:00   1x ▼   ⛶   │
│                          ↑ klikacie = seek                     ↑ speed    │
└────────────────────────────────────────────────────────────────────────────┘
```

Dropdown prędkości:
```
[ 1x ▼ ]
├── 0.5x
├── 0.75x
├── 1x ✓
├── 1.25x
├── 1.5x
└── 2x
```

---

## Podsumowanie zmian

| Plik | Zmiana | Cel |
|------|--------|-----|
| `SecureVideoControls.tsx` | **NOWY** | Kontrolki z seek/speed bez download |
| `SecureMedia.tsx` | Nowy prop `controlMode` + logika | Wybór trybu kontrolek |
| `CMSContent.tsx` | `controlMode="secure"` dla wideo | Aktywacja bezpiecznych kontrolek |

## Zachowana funkcjonalność

- ✅ Strona Page.tsx nadal używa `useSecurityPreventions()` (prawy przycisk, Ctrl+S)
- ✅ CSS `user-select: none` działa globalnie
- ✅ Szkolenia (TrainingViewer) używają istniejącego `disableInteraction` / `controlMode="restricted"`
- ✅ Wideo z YouTube - bez zmian (nie można kontrolować)

## Efekt końcowy

Na stronie Aktualności:
- Wideo ma pełne kontrolki (play, pause, seek, speed, fullscreen)
- Brak natywnego menu "Pobierz"
- Brak możliwości prawego kliknięcia
- Brak możliwości zaznaczenia/kopiowania
- Wideo wyświetlane w bezpieczny sposób
