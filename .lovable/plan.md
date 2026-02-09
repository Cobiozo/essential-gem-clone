

# Plan: Naprawa zacinania się wideo w akademii szkoleniowej

## Diagnoza problemu

Na podstawie analizy kodu i screenshotu zidentyfikowano następujące problemy:

### Problem główny: Brak obsługi buforowania dla ukończonych lekcji

W `SecureMedia.tsx` cała logika obsługi buforowania (handleWaiting, handleCanPlay, handleProgress, handleError z retry) jest uruchamiana **tylko gdy `disableInteraction=true`** (linia 578):

```tsx
if (mediaType !== 'video' || !disableInteraction || !videoElement) return;
```

Gdy lekcja jest ukończona (`isLessonCompleted=true`), prop `disableInteraction=false`, więc:
- Brak obsługi zdarzeń `waiting`, `stalled`, `canplay`, `progress`
- Brak mechanizmu retry przy błędach sieciowych
- Brak smart buffering i recovery

### Problem dodatkowy: Preload ustawiony nieprawidłowo

| Tryb wideo | Preload | Problem |
|------------|---------|---------|
| Restricted (nieukończona lekcja) | `auto` dla purelife.info.pl | OK |
| Native controls (ukończona lekcja) | `metadata` | Zbyt mało buforowania |
| Secure mode (artykuły/news) | `metadata` | Zbyt mało buforowania |

---

## Rozwiązanie

### Zmiana 1: Dodanie obsługi buforowania dla trybu unrestricted (ukończone lekcje)

Rozszerzenie `useEffect` z linii 942-1005 o handlery dla `waiting`, `stalled`, `canplay`, `progress` i `error`. 

**Kluczowe handlery do dodania:**
- `handleWaiting` - ustawia stan buforowania
- `handleStalled` - reakcja na zatrzymanie strumienia
- `handleCanPlay` - reset stanów buforowania
- `handleError` - retry z exponential backoff

### Zmiana 2: Poprawienie preload dla wszystkich trybów video

Zmiana `preload="metadata"` na `preload="auto"` dla wideo z purelife.info.pl we wszystkich trybach renderowania (native controls i secure mode).

### Zmiana 3: Dodanie spinnera buforowania dla trybu unrestricted

W trybie native controls brak wizualnego wskaźnika buforowania - użytkownik widzi tylko zamrożony obraz.

---

## Szczegóły implementacji

### Plik: `src/components/SecureMedia.tsx`

**Zmiana 1: Rozszerzenie handlera dla trybu unrestricted (linie ~942-1005)**

Dodanie obsługi buforowania do istniejącego useEffect:

```tsx
// Time tracking for unrestricted mode and secure mode
useEffect(() => {
  if (mediaType !== 'video' || !videoElement) return;
  if (disableInteraction && controlMode !== 'secure') return;

  let mounted = true;
  const video = videoElement;

  // NEW: Buffering handlers for unrestricted/secure modes
  const handleWaiting = () => {
    if (!mounted) return;
    console.log('[SecureMedia] Unrestricted mode - video waiting');
    setIsBuffering(true);
    
    // Debounced spinner display
    if (spinnerTimeoutRef.current) clearTimeout(spinnerTimeoutRef.current);
    spinnerTimeoutRef.current = setTimeout(() => {
      if (!video.paused && video.readyState < 3) {
        setShowBufferingSpinner(true);
      }
    }, 1500);
  };

  const handleStalled = () => {
    if (!mounted) return;
    console.log('[SecureMedia] Unrestricted mode - video stalled');
    setIsBuffering(true);
  };

  const handleCanPlay = () => {
    if (!mounted) return;
    console.log('[SecureMedia] Unrestricted mode - can play');
    setIsBuffering(false);
    setShowBufferingSpinner(false);
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
      spinnerTimeoutRef.current = undefined;
    }
  };

  const handleError = (e: Event) => {
    if (!mounted) return;
    const errorType = getVideoErrorType(video);
    console.error('[SecureMedia] Unrestricted mode error:', errorType, e);
    
    const maxRetries = bufferConfigRef.current.maxRetries;
    if (retryCount < maxRetries) {
      const delay = getRetryDelay(retryCount, bufferConfigRef.current.retryDelayMs);
      console.log(`[SecureMedia] Unrestricted retry ${retryCount + 1}/${maxRetries} after ${delay}ms`);
      
      setTimeout(() => {
        if (video && mounted) {
          const currentPos = video.currentTime;
          video.load();
          video.currentTime = currentPos;
          setRetryCount(prev => prev + 1);
        }
      }, delay);
    } else {
      setHasExhaustedRetries(true);
    }
  };

  // Existing handlers...
  const handleTimeUpdate = () => { /* ... existing code ... */ };
  const handlePlay = () => { /* ... existing code ... */ };
  const handlePause = () => { /* ... existing code ... */ };
  const handleLoadedMetadata = () => { /* ... existing code ... */ };

  // Add new listeners
  video.addEventListener('waiting', handleWaiting);
  video.addEventListener('stalled', handleStalled);
  video.addEventListener('canplay', handleCanPlay);
  video.addEventListener('canplaythrough', handleCanPlay);
  video.addEventListener('error', handleError);
  // ... existing listeners ...

  return () => {
    mounted = false;
    video.removeEventListener('waiting', handleWaiting);
    video.removeEventListener('stalled', handleStalled);
    video.removeEventListener('canplay', handleCanPlay);
    video.removeEventListener('canplaythrough', handleCanPlay);
    video.removeEventListener('error', handleError);
    // ... existing cleanup ...
    
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }
  };
}, [mediaType, disableInteraction, signedUrl, videoElement, retryCount, controlMode]);
```

**Zmiana 2: Poprawienie preload dla native controls (linia ~1418)**

Przed:
```tsx
preload="metadata"
```

Po:
```tsx
preload={signedUrl.includes('purelife.info.pl') ? 'auto' : 'metadata'}
```

**Zmiana 3: Poprawienie preload dla secure mode (linia ~1239)**

Przed:
```tsx
preload="metadata"
```

Po:
```tsx
preload={signedUrl.includes('purelife.info.pl') ? 'auto' : 'metadata'}
```

**Zmiana 4: Dodanie spinnera buforowania do native controls (linia ~1408-1428)**

```tsx
return (
  <div className={`relative w-full aspect-video bg-black rounded-lg ${className || ''}`}>
    <video
      ref={videoRefCallback}
      {...securityProps}
      src={signedUrl}
      controls
      controlsList="nodownload"
      className="absolute inset-0 w-full h-full object-contain rounded-lg"
      preload={signedUrl.includes('purelife.info.pl') ? 'auto' : 'metadata'}
      playsInline
      webkit-playsinline="true"
      {...(signedUrl.includes('supabase.co') && { crossOrigin: "anonymous" })}
    >
      Twoja przeglądarka nie obsługuje odtwarzania wideo.
    </video>
    {/* NEW: Buffering spinner overlay */}
    {showBufferingSpinner && (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-lg pointer-events-none">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
        <span className="text-white text-sm mt-2">Ładowanie...</span>
      </div>
    )}
  </div>
);
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/components/SecureMedia.tsx` | Dodanie obsługi buforowania dla trybu unrestricted (handleWaiting, handleStalled, handleCanPlay, handleError) |
| `src/components/SecureMedia.tsx` | Zmiana preload na 'auto' dla purelife.info.pl we wszystkich trybach |
| `src/components/SecureMedia.tsx` | Dodanie spinnera buforowania do trybu native controls |
| `src/components/SecureMedia.tsx` | Obsługa retry z exponential backoff dla ukończonych lekcji |

---

## Oczekiwany efekt

1. Wideo w ukończonych lekcjach będzie miało pełną obsługę buforowania
2. Automatyczny retry przy problemach sieciowych (do 5-6 prób)
3. Wizualny spinner informujący o ładowaniu w każdym trybie
4. Lepsze preloadowanie dla wideo z serwera VPS (purelife.info.pl)
5. Recovery po stalled/waiting events bez ręcznego odświeżania strony

---

## Schemat działania po zmianach

```text
Użytkownik uruchamia wideo (ukończona lekcja)
        ↓
Preload: 'auto' dla purelife.info.pl
        ↓
Zdarzenie 'waiting' → setIsBuffering(true) + debounced spinner
        ↓
Po 1.5s bez recovery → wyświetl spinner
        ↓
Zdarzenie 'canplay' → ukryj spinner, kontynuuj odtwarzanie
        ↓
Błąd sieciowy → retry z exponential backoff (2s, 4s, 8s...)
        ↓
Max retries → komunikat "Nie można załadować wideo"
```

