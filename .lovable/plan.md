

# Fix: podwójne dotknięcie na iOS + irytujący bufor

## Problem 1: Podwójne dotknięcie Play na iOS
**Przyczyna**: `handlePlayPause` sprawdza `wasBackgroundedRef.current || video.readyState < 2` i uruchamia pełny `recoverPlayback()` zamiast prostego `video.play()`. Recovery czyści flagi, reloaduje wideo, czeka na metadane — to trwa i pierwszy tap wydaje się "nie działać". Dodatkowo iOS Safari ma wbudowane 300ms opóźnienie na touch events.

**Fix**:
- Dodać `touch-action: manipulation` na przyciskach (CSS) — eliminuje 300ms delay na iOS Safari
- W `handlePlayPause`: jeśli `readyState >= 2` i nie było backgroundingu, użyć prostego `video.play()` bez recovery. Recovery tylko gdy pipeline naprawdę martwy
- Po każdym udanym `play()` natychmiast resetować `wasBackgroundedRef = false`

## Problem 2: Irytujący bufor zamiast gotowego wideo z przyciskiem Play
**Przyczyna**: `isInitialBuffering` startuje jako `true` i wyświetla komunikat "Przygotowuję wideo do odtwarzania..." + spinner overlay dopóki bufor nie osiągnie 70%. Użytkownik widzi "ładowanie" zamiast gotowego wideo z przyciskiem Play.

**Fix — zmiana UX**: 
- Usunąć koncept `isInitialBuffering` z UI — nie pokazywać komunikatu "Buforowanie wideo..." na starcie
- Zamiast tego: gdy wideo załaduje metadane (`loadedmetadata`/`canplay`), od razu pokazać kadr wideo z dużym przyciskiem Play overlay (jak YouTube)
- Spinner overlay (`!videoReady`) tylko do momentu `loadeddata` (pierwszy kadr) — potem ukryć
- Komunikat o buforowaniu pokazywać TYLKO gdy wideo się zacina w trakcie odtwarzania (smart buffering), nie przy pierwszym ładowaniu
- VideoControls: `isBuffering` prop przekazywać tylko `isSmartBuffering`, bez `isInitialBuffering`

## Plan zmian

### `src/components/SecureMedia.tsx`
1. **Usunąć `isInitialBuffering` z overlaya i kontrolek** — nie blokować UI na starcie
2. **Dodać overlay "Play" na gotowym wideo** — duży przycisk play gdy wideo gotowe ale nie uruchomione (zamiast spinnera)
3. **Zmienić linię 2100**: `isBuffering={isSmartBuffering}` zamiast `isBuffering={isInitialBuffering || isSmartBuffering}`
4. **Analogicznie dla secure mode** (linia 1996)
5. **handlePlayPause**: uprosić — nie wchodzić w recovery gdy `readyState >= 2`
6. **Dodać CSS `touch-action: manipulation`** na kontener przycisków

### `src/components/training/VideoControls.tsx`
1. Dodać `style={{ touchAction: 'manipulation' }}` na przyciskach Play/Pause i Rewind
2. Usunąć komunikat "Przygotowuję wideo do odtwarzania..." — nie pokazywać go jako stan startowy
3. Komunikat buforowania tylko dla `isSmartBuffering` w trakcie odtwarzania

### `src/components/training/SecureVideoControls.tsx`
1. Dodać `touch-action: manipulation` na przyciskach
2. Analogiczne zmiany UX bufora

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/SecureMedia.tsx` | Usunąć initialBuffering z UI, overlay Play, uprosić handlePlayPause, touch-action |
| `src/components/training/VideoControls.tsx` | touch-action, usunąć startowy komunikat bufora |
| `src/components/training/SecureVideoControls.tsx` | touch-action |

## Efekt
- Jedno dotknięcie = natychmiastowa reakcja (bez 300ms delay iOS)
- Wideo pojawia się z kadrem i dużym przyciskiem Play — sugeruje gotowość
- Komunikat buforowania tylko gdy wideo się zacina w trakcie oglądania
- Koniec wrażenia "wiecznego ładowania" przy wejściu na lekcję

