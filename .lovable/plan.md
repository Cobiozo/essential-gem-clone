

# Plan: Zapobieganie przeładowaniu i zapamiętywanie pozycji wideo

## Zdiagnozowane problemy

| Problem | Przyczyna | Lokalizacja |
|---------|-----------|-------------|
| Aplikacja "przeładowuje się" | Wideo pauzuje przy zmianie karty, ale nie pamięta pozycji | `SecureMedia.tsx` linia 936-955 |
| Brak zapamiętywania pozycji | `CMSContent.tsx` nie przekazuje `onTimeUpdate` ani `initialTime` do `SecureMedia` | `CMSContent.tsx` |
| Strona pozostaje na miejscu | To działa poprawnie - aplikacja NIE robi window.reload() | React SPA |

## Wyjaśnienie zachowania

1. **Aplikacja NIE przeładowuje się** - React SPA pozostaje w tym samym miejscu
2. **Wideo się pauzuje** przy zmianie karty (to jest zamierzone zachowanie bezpieczeństwa)
3. **Problem**: Po powrocie na kartę wideo nie wznawia się automatycznie i nie pamięta pozycji

## Rozwiązanie

Wzorujemy się na `HealthyKnowledgePlayer.tsx` (linie 80-127), który poprawnie zapamiętuje pozycję:
- Zapisuje do `localStorage` przy zmianie karty
- Zapisuje co 5 sekund podczas odtwarzania
- Zapisuje przed zamknięciem strony
- Wznawia z zapisanej pozycji przy powrocie

---

## Sekcja techniczna

### 1. Nowy hook: `src/hooks/useVideoProgress.ts`

Wyodrębniony hook do zarządzania postępem wideo w CMS:

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';

interface VideoProgress {
  position: number;
  updatedAt: number;
}

interface UseVideoProgressOptions {
  videoId: string;  // Unique identifier (mediaUrl or item id)
  maxAge?: number;  // Max age in ms before progress is discarded (default: 7 days)
}

export const useVideoProgress = ({ videoId, maxAge = 7 * 24 * 60 * 60 * 1000 }: UseVideoProgressOptions) => {
  const [savedPosition, setSavedPosition] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTimeRef = useRef(0);
  
  // Generate storage key from video ID
  const storageKey = `cms_video_progress_${videoId}`;
  
  // Load saved progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const progress: VideoProgress = JSON.parse(saved);
        if (Date.now() - progress.updatedAt < maxAge && progress.position > 5) {
          setSavedPosition(progress.position);
        }
      } catch (e) {
        console.error('Error parsing saved video progress:', e);
      }
    }
  }, [storageKey, maxAge]);
  
  // Save progress function
  const saveProgress = useCallback((position: number) => {
    if (!videoId || position <= 0) return;
    localStorage.setItem(storageKey, JSON.stringify({
      position,
      updatedAt: Date.now()
    }));
  }, [storageKey, videoId]);
  
  // Update ref when time changes
  const handleTimeUpdate = useCallback((time: number) => {
    currentTimeRef.current = time;
  }, []);
  
  // Handle play state change
  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);
  
  // Save on visibility change (tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [saveProgress]);
  
  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveProgress]);
  
  // Periodic save every 5 seconds during playback
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      if (currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPlaying, saveProgress]);
  
  // Clear saved progress
  const clearProgress = useCallback(() => {
    localStorage.removeItem(storageKey);
    setSavedPosition(null);
  }, [storageKey]);
  
  return {
    savedPosition,
    handleTimeUpdate,
    handlePlayStateChange,
    clearProgress,
    currentTimeRef
  };
};
```

### 2. Nowy komponent: `src/components/SecureVideoWithProgress.tsx`

Wrapper wokół `SecureMedia` z obsługą postępu dla CMS:

```typescript
import React, { useState } from 'react';
import { SecureMedia } from '@/components/SecureMedia';
import { useVideoProgress } from '@/hooks/useVideoProgress';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw } from 'lucide-react';

interface SecureVideoWithProgressProps {
  mediaUrl: string;
  videoId: string;  // Unique ID for progress tracking
  className?: string;
  altText?: string;
}

export const SecureVideoWithProgress: React.FC<SecureVideoWithProgressProps> = ({
  mediaUrl,
  videoId,
  className,
  altText
}) => {
  const [initialTime, setInitialTime] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(true);
  
  const {
    savedPosition,
    handleTimeUpdate,
    handlePlayStateChange,
    clearProgress
  } = useVideoProgress({ videoId });
  
  const handleResume = () => {
    if (savedPosition) {
      setInitialTime(savedPosition);
    }
    setShowResumePrompt(false);
  };
  
  const handleStartOver = () => {
    setInitialTime(0);
    clearProgress();
    setShowResumePrompt(false);
  };
  
  // Show resume prompt if there's saved progress
  if (savedPosition && showResumePrompt) {
    const minutes = Math.floor(savedPosition / 60);
    const seconds = Math.floor(savedPosition % 60);
    
    return (
      <div className={className}>
        <div className="bg-card border rounded-lg p-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Masz zapisany postęp oglądania
          </p>
          <p className="font-medium">
            Kontynuować od {minutes}:{seconds.toString().padStart(2, '0')}?
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleResume} size="sm">
              <Play className="h-4 w-4 mr-1" />
              Kontynuuj
            </Button>
            <Button onClick={handleStartOver} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-1" />
              Od początku
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <SecureMedia
      mediaUrl={mediaUrl}
      mediaType="video"
      controlMode="secure"
      className={className}
      altText={altText}
      initialTime={initialTime}
      onTimeUpdate={handleTimeUpdate}
      onPlayStateChange={handlePlayStateChange}
    />
  );
};
```

### 3. Modyfikacja: `src/components/CMSContent.tsx`

Zastąpienie `<SecureMedia mediaType="video" controlMode="secure">` nowym komponentem:

**Import (na górze pliku):**
```typescript
import { SecureVideoWithProgress } from '@/components/SecureVideoWithProgress';
```

**W `renderSubCell()` (linie 352-362):**
```typescript
// Zamień:
<SecureMedia
  mediaUrl={subCell.media_url}
  mediaType="video"
  controlMode="secure"
  className="w-full rounded"
/>

// Na:
<SecureVideoWithProgress
  mediaUrl={subCell.media_url}
  videoId={subCell.id}  // użyj unikalnego ID komórki
  className="w-full rounded"
/>
```

**W case `'video'` (linie 875-890):**
```typescript
// Zamień:
<SecureMedia
  mediaUrl={videoUrl}
  mediaType="video"
  controlMode="secure"
  className="w-full max-w-full rounded-lg"
/>

// Na:
<SecureVideoWithProgress
  mediaUrl={videoUrl}
  videoId={item.id}  // użyj unikalnego ID elementu
  className="w-full max-w-full rounded-lg"
/>
```

**W `renderMedia()` (linia 47-58):**
```typescript
// Jeśli video, użyj SecureVideoWithProgress zamiast SecureMedia
if (item.media_type === 'video') {
  return (
    <SecureVideoWithProgress
      mediaUrl={item.media_url}
      videoId={item.id}
      className="w-full max-w-md mx-auto shadow-lg mb-4"
      altText={item.media_alt_text || item.title || 'Wideo'}
    />
  );
}

// Dla innych typów mediów - pozostaw SecureMedia
return (
  <SecureMedia
    mediaUrl={item.media_url}
    mediaType={item.media_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
    ...
  />
);
```

---

## Podsumowanie zmian

| Plik | Zmiana | Cel |
|------|--------|-----|
| `useVideoProgress.ts` | **NOWY** | Hook do zarządzania postępem wideo |
| `SecureVideoWithProgress.tsx` | **NOWY** | Wrapper z obsługą wznawiania |
| `CMSContent.tsx` | Zamiana `SecureMedia` na `SecureVideoWithProgress` dla wideo | Aktywacja zapamiętywania pozycji |

## Efekt końcowy

Po przełączeniu na inną kartę przeglądarki:
- Strona NIE przeładowuje się (pozostaje na Aktualnościach)
- Wideo pauzuje automatycznie (zabezpieczenie)
- Pozycja jest zapisywana do `localStorage`
- Po powrocie na kartę - użytkownik może kontynuować od miejsca, w którym skończył
- Zapisana pozycja jest ważna przez 7 dni

## Dodatkowe korzyści

- Działa nawet po zamknięciu i ponownym otwarciu przeglądarki
- Zapisuje co 5 sekund podczas odtwarzania (ochrona przed utratą)
- Zapisuje przy zamknięciu strony (beforeunload)
- Użytkownik może wybrać "Od początku" jeśli chce

