
# Plan: Naprawa problemów iPhone + UX w lekcjach wideo

## Zidentyfikowane problemy ze screenshotów

| # | Screenshot | Problem | Przyczyna |
|---|------------|---------|-----------|
| 1 | 169, 170 | Spinner "Ładowanie..." wyświetla się mimo że wideo gra (5:01/18:43) | `isBuffering=true` pozostaje aktywne nawet gdy wideo odtwarza się normalnie - brak timeoutu na ukrycie spinnera |
| 2 | 171 | Zapis obrazu do "Pliki" zamiast galerii | Brak implementacji Web Share API dla iOS |
| 3 | 172 | Sidebar może nie reagować na dotyk na iOS | Brak `touch-action: manipulation` eliminującego 300ms delay |
| 4 | 173 | Nagłówek "Strona główna" ucięty, elementy przepełniają ekran | Brak `overflow-hidden` i `flex-shrink` w nawigacji mobilnej |
| 5 | 169, 170 | Wideo ma `max-h-96` (384px) co ogranicza widoczność | Zbyt restrykcyjna maksymalna wysokość na mobile |

---

## Rozwiązania techniczne

### 1. Spinner "Ładowanie..." - timeout wymuszający ukrycie

**Problem:** Spinner pozostaje widoczny mimo że wideo gra (widać pasek postępu 5:01/18:43).

**Rozwiązanie:** Dodać timeout 3 sekundy od rozpoczęcia odtwarzania - jeśli wideo gra, ukryj spinner niezależnie od `isBuffering` state.

**Plik:** `src/components/SecureMedia.tsx`

```typescript
// Nowy state i ref:
const [forceHideBuffering, setForceHideBuffering] = useState(false);
const playStartTimeRef = useRef<number | null>(null);

// W handlePlay():
const handlePlay = () => {
  setIsPlaying(true);
  onPlayStateChangeRef.current?.(true);
  
  // Start timer to force-hide buffering after 3s of playback
  playStartTimeRef.current = Date.now();
  setTimeout(() => {
    if (playStartTimeRef.current && Date.now() - playStartTimeRef.current >= 2900) {
      setForceHideBuffering(true);
    }
  }, 3000);
};

// W handlePause():
const handlePause = () => {
  setIsPlaying(false);
  playStartTimeRef.current = null;
  setForceHideBuffering(false);
  // ... reszta
};

// W JSX - zmienić warunek wyświetlania spinnera:
{isBuffering && !forceHideBuffering && (
  <div className="absolute inset-0 ...">
    ...
  </div>
)}
```

**Lokalizacje zmian:**
- Linia ~88: Dodać nowe stany
- Linia ~813: Zmodyfikować `handlePlay`
- Linia ~823: Zmodyfikować `handlePause`
- Linie ~1177, ~1266: Zmienić warunek renderowania spinnera

---

### 2. Zapis obrazu do galerii na iOS (Web Share API)

**Problem:** Na iOS obraz zapisuje się do "Pliki" zamiast do galerii zdjęć.

**Rozwiązanie:** Utworzyć helper `imageShareUtils.ts` i zaktualizować `GalleryElement.tsx` z przyciskiem "Zapisz do galerii".

**Nowy plik:** `src/lib/imageShareUtils.ts`

```typescript
export const isIOSDevice = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
};

export const canUseWebShare = (): boolean => {
  return 'share' in navigator && 'canShare' in navigator;
};

export const shareOrDownloadImage = async (
  imageUrl: string,
  fileName: string = 'image.jpg'
): Promise<boolean> => {
  try {
    if (canUseWebShare() && isIOSDevice()) {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });
      
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Zapisz obraz' });
        return true;
      }
    }
    
    // Fallback - standardowe pobieranie
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    link.click();
    return true;
  } catch (error) {
    console.error('Share/download failed:', error);
    return false;
  }
};
```

**Plik:** `src/components/elements/GalleryElement.tsx`

Dodać przycisk w dialogu powiększonego obrazu:
```tsx
import { shareOrDownloadImage, isIOSDevice } from '@/lib/imageShareUtils';
import { Download, Share2 } from 'lucide-react';

// W DialogContent, po obrazie:
<div className="absolute top-4 right-4">
  <Button
    variant="secondary"
    size="sm"
    onClick={() => shareOrDownloadImage(selectedImage.url, 'gallery-image.jpg')}
    className="gap-2"
  >
    {isIOSDevice() ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
    {isIOSDevice() ? 'Zapisz' : 'Pobierz'}
  </Button>
</div>
```

---

### 3. Touch responsiveness na iOS (300ms delay fix)

**Problem:** Sidebar i przyciski mogą nie reagować na dotyk na iOS Safari.

**Rozwiązanie:** Dodać `touch-action: manipulation` do CSS i komponentu Sheet.

**Plik:** `src/index.css` (dodać po linii 218)

```css
/* iOS Safari touch responsiveness - eliminacja 300ms delay */
button,
a,
[role="button"],
[data-sidebar],
[data-sidebar-trigger],
[data-state] {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* Lepsze zachowanie scroll na iOS */
.overflow-auto,
.overflow-y-auto,
.overflow-x-auto,
[data-radix-scroll-area-viewport] {
  -webkit-overflow-scrolling: touch;
}
```

**Plik:** `src/components/ui/sheet.tsx` (linia ~58)

```tsx
<SheetPrimitive.Content 
  ref={ref} 
  className={cn(sheetVariants({ side }), className)} 
  style={{ touchAction: 'manipulation' }}
  {...props}
>
```

---

### 4. Viewport i meta tagi dla iOS

**Problem:** Rozdzielczość nie dopasowuje się do iPhone, elementy ucięte.

**Rozwiązanie:** Zaktualizować meta tagi w `index.html`.

**Plik:** `index.html` (linia 5)

```html
<!-- PRZED -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, minimum-scale=1.0, viewport-fit=cover" />

<!-- PO -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, viewport-fit=cover, user-scalable=no" />

<!-- Dodać po linii 5: -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="format-detection" content="telephone=no" />
```

---

### 5. Responsywna wysokość wideo w lekcjach

**Problem:** `max-h-96` (384px) ogranicza wysokość wideo, przez co na mobile jest za małe.

**Rozwiązanie:** Zmienić na responsywną wysokość `max-h-[60vh]`.

**Plik:** `src/pages/TrainingModule.tsx` (linia ~1314)

```tsx
// PRZED
className="w-full max-h-96 object-contain"

// PO  
className="w-full max-h-[50vh] sm:max-h-[60vh] lg:max-h-[70vh] object-contain"
```

---

## Podsumowanie zmian

| Plik | Typ | Problem |
|------|-----|---------|
| `src/components/SecureMedia.tsx` | Edycja | #1 - Spinner timeout |
| `src/lib/imageShareUtils.ts` | **Nowy** | #2 - iOS Web Share |
| `src/components/elements/GalleryElement.tsx` | Edycja | #2 - Przycisk zapisz |
| `src/index.css` | Edycja | #3 - Touch action |
| `src/components/ui/sheet.tsx` | Edycja | #3 - Sheet touch |
| `index.html` | Edycja | #4 - iOS meta tags |
| `src/pages/TrainingModule.tsx` | Edycja | #5 - Responsywne wideo |

---

## Rezultat

Po zmianach:

1. **Spinner "Ładowanie..."** - ukrywa się automatycznie po 3 sekundach odtwarzania, nawet jeśli `isBuffering` błędnie pozostaje `true`

2. **Zapis do galerii na iOS** - przycisk "Zapisz" w powiększonej galerii używa Web Share API, pokazując natywny iOS sheet z opcją "Save Image" bezpośrednio do Photos

3. **Touch responsiveness** - eliminacja 300ms delay na iOS Safari przez `touch-action: manipulation`

4. **Viewport iOS** - blokada zoom + meta tagi Apple dla lepszej integracji PWA

5. **Wysokość wideo** - responsywna wysokość `50vh` na mobile, `60vh` na tablet, `70vh` na desktop zamiast stałych 384px
