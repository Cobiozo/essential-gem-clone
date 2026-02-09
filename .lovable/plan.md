

# Audyt modułu szkoleniowego - odtwarzanie wideo

## Executive Summary

Moduł szkoleniowy posiada solidną podstawę do obsługi wideo, ale zidentyfikowałem **6 krytycznych problemów** wpływających na płynność odtwarzania i stabilność buforowania.

---

## Zidentyfikowane problemy

### Problem 1: KRYTYCZNY - Podwójne resetowanie stanu przy zmianie lekcji

**Lokalizacja:** `src/components/SecureMedia.tsx` (linie 385-419)

**Opis:** W logach konsoli widzę:
```
[SecureMedia] mediaUrl changed, resetting all state
[SecureMedia] mediaUrl changed, resetting all state  ← PODWÓJNE!
[SecureMedia] Setting initial position...
```

Efekt resetowania stanu jest wywoływany dwukrotnie, co powoduje:
- Wielokrotne żądania sieciowe do tego samego pliku
- Przerwanie buforowania w trakcie
- Opóźnione załadowanie wideo

**Przyczyna:** Brak debounce/guard w useEffect, który reaguje na zmianę `mediaUrl`.

---

### Problem 2: WAŻNY - Brak obsługi `progress` event dla trybu unrestricted

**Lokalizacja:** `src/components/SecureMedia.tsx` (linie 942-1077)

**Opis:** W trybie unrestricted (ukończone lekcje) brakuje handlera `handleProgress`, który jest obecny w trybie restricted (linie 730-778). Skutkuje to:
- Brakiem śledzenia postępu buforowania
- Brakiem wizualizacji buffered ranges
- Brakiem smart buffering recovery

```tsx
// RESTRICTED MODE - ma handleProgress (linia 730):
const handleProgress = () => {
  if (video.buffered.length > 0 && video.duration > 0) {
    const bufferedAheadValue = getBufferedAhead(video);
    setBufferedAhead(bufferedAheadValue);
    setBufferProgress(progress);
    // ... smart buffering logic
  }
};

// UNRESTRICTED MODE - BRAK handleProgress!
```

---

### Problem 3: WAŻNY - Brak canplaythrough event w niektórych trybach

**Lokalizacja:** `src/components/SecureMedia.tsx`

**Opis:** W trybie unrestricted nasłuchujemy `canplaythrough`, ale nie wykorzystujemy go optymalnie do resetowania stanów buforowania. Zdarzenie `canplaythrough` oznacza, że przeglądarka ocenia, że wideo może być odtwarzane do końca bez przerw - to najlepszy moment na reset stanów.

---

### Problem 4: ŚREDNI - Mobile preload strategy `metadata` vs `auto`

**Lokalizacja:** `src/lib/videoBufferConfig.ts` (linia 33)

**Opis:** Na urządzeniach mobilnych używana jest strategia `preloadStrategy: 'metadata'`, podczas gdy dla wideo z `purelife.info.pl` wymuszany jest `preload="auto"`. To powoduje niespójność:

```tsx
// videoBufferConfig.ts (mobile):
preloadStrategy: 'metadata' as const,

// SecureMedia.tsx (linia 1399):
preload={signedUrl.includes('purelife.info.pl') ? 'auto' : bufferConfigRef.current.preloadStrategy}
```

Dla VPS wideo jest `auto`, ale dla Supabase Storage na mobile jest `metadata` - może powodować wolniejsze ładowanie.

---

### Problem 5: ŚREDNI - Brak mechanizmu preconnect dla VPS

**Lokalizacja:** Brak implementacji

**Opis:** Dla wideo z `purelife.info.pl` brakuje optymalizacji połączenia:
- Brak `<link rel="preconnect">` do domeny VPS
- Brak `<link rel="dns-prefetch">`
- Każde nowe wideo wymaga pełnego handshake'u SSL

---

### Problem 6: NISKI - Nieoptymalna obsługa przejścia między lekcjami

**Lokalizacja:** `src/pages/TrainingModule.tsx` (linie 406-437)

**Opis:** Prefetch następnego wideo pomija wideo z VPS (`purelife.info.pl`):

```tsx
if (isYouTube || isExternalUrl) {  // isExternalUrl = true dla purelife.info.pl
  console.log('[TrainingModule] Skipping prefetch for external URL:', nextLesson.title);
  return;  // ← Pomija prefetch dla VPS!
}
```

---

## Rozwiązania

### Rozwiązanie 1: Debounce resetowania stanu w SecureMedia

```tsx
// Dodać ref do śledzenia ostatniego mediaUrl
const lastMediaUrlRef = useRef<string | null>(null);

useEffect(() => {
  // Guard: Skip if same URL (prevent double reset)
  if (mediaUrl === lastMediaUrlRef.current) {
    console.log('[SecureMedia] Same mediaUrl, skipping reset');
    return;
  }
  lastMediaUrlRef.current = mediaUrl;
  
  console.log('[SecureMedia] mediaUrl changed, resetting all state');
  // ... existing reset logic
}, [mediaUrl]);
```

---

### Rozwiązanie 2: Dodanie handleProgress do trybu unrestricted

```tsx
// W useEffect dla unrestricted mode (linia ~942):
const handleProgress = () => {
  if (!mounted || !video.buffered || video.buffered.length === 0) return;
  
  const bufferedAheadValue = getBufferedAhead(video);
  setBufferedAhead(bufferedAheadValue);
  
  // Update buffered ranges for visualization (jeśli potrzebne)
  setBufferedRanges(getBufferedRanges(video));
};

// Dodać listener:
video.addEventListener('progress', handleProgress);

// Cleanup:
video.removeEventListener('progress', handleProgress);
```

---

### Rozwiązanie 3: Preconnect do VPS przy wejściu na /training

```tsx
// W TrainingModule.tsx - na początku komponentu:
useEffect(() => {
  // Add preconnect hint for VPS
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://purelife.info.pl';
  preconnect.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect);
  
  return () => {
    if (preconnect.parentNode) {
      document.head.removeChild(preconnect);
    }
  };
}, []);
```

---

### Rozwiązanie 4: Włączenie prefetch dla wideo z VPS

```tsx
// W TrainingModule.tsx (linia ~406-437):
useEffect(() => {
  if (lessons.length === 0 || currentLessonIndex >= lessons.length - 1) return;
  
  const nextLesson = lessons[currentLessonIndex + 1];
  if (nextLesson?.media_type === 'video' && nextLesson?.media_url) {
    const url = nextLesson.media_url;
    
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    
    // ZMIANA: Pozwól na prefetch dla VPS (purelife.info.pl)
    if (isYouTube) {
      return;
    }
    
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    link.as = 'video';
    // Dla VPS dodaj crossorigin
    if (url.includes('purelife.info.pl')) {
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);
    
    console.log('[TrainingModule] Preloading next lesson video:', nextLesson.title);
    
    return () => {
      if (link.parentNode) {
        document.head.removeChild(link);
      }
    };
  }
}, [lessons, currentLessonIndex]);
```

---

### Rozwiązanie 5: Ujednolicenie preload strategy dla mobile

```tsx
// W src/lib/videoBufferConfig.ts:
mobile: {
  // ZMIANA: auto dla lepszego preloadingu
  preloadStrategy: 'auto' as const,
  // ... rest
}
```

Alternatywnie - zachować `metadata` ale dodać warunek w SecureMedia:

```tsx
// Zawsze używaj 'auto' dla wideo treningowych (disableInteraction = true)
preload={
  signedUrl.includes('purelife.info.pl') || disableInteraction 
    ? 'auto' 
    : bufferConfigRef.current.preloadStrategy
}
```

---

## Podsumowanie zmian

| Plik | Zmiana | Wpływ |
|------|--------|-------|
| `src/components/SecureMedia.tsx` | Guard przed podwójnym resetem stanu | Eliminacja podwójnych żądań sieciowych |
| `src/components/SecureMedia.tsx` | Dodanie handleProgress dla trybu unrestricted | Lepsze śledzenie buforowania |
| `src/pages/TrainingModule.tsx` | Preconnect do VPS na starcie | Szybsze nawiązanie połączenia |
| `src/pages/TrainingModule.tsx` | Włączenie prefetch dla wideo VPS | Szybsze ładowanie następnych lekcji |
| `src/lib/videoBufferConfig.ts` | Zmiana mobile preloadStrategy na 'auto' | Spójne buforowanie |

---

## Oczekiwane rezultaty

1. **Eliminacja podwójnego ładowania** - jedno żądanie na zmianę lekcji
2. **Szybsze ładowanie** - preconnect + prefetch dla VPS
3. **Lepsze recovery po zacinaniu** - handleProgress dla wszystkich trybów
4. **Płynniejsze przejścia** - brak resetowania stanu przy tym samym URL
5. **Spójne UX na mobile** - jednolita strategia preload

---

## Schemat przepływu po zmianach

```text
Użytkownik otwiera lekcję
        ↓
Preconnect do purelife.info.pl (pierwszy raz)
        ↓
SecureMedia: Guard sprawdza czy mediaUrl się zmienił
        ↓
TAK → Reset stanów, załaduj wideo z preload='auto'
NIE → Pomiń reset, zachowaj bufor
        ↓
handleProgress śledzi buforowanie
        ↓
Prefetch następnej lekcji w tle
        ↓
Użytkownik przechodzi do następnej → natychmiastowe odtwarzanie
```

