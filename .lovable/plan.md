

# Plan: Zapisz do galerii na wszystkich urządzeniach mobilnych

## Obecny problem

1. **`imageShareUtils.ts`** - Web Share API jest używane tylko na iOS (`isIOSDevice()`)
2. **`SocialShareDialog.tsx`** - nie używa `shareOrDownloadImage()`, tylko `window.open()`

## Rozwiązanie

### 1. Zaktualizować `imageShareUtils.ts`

Usunąć warunek `isIOSDevice()` - Web Share API działa na:
- iOS Safari, Chrome, Firefox
- Android Chrome, Samsung Internet, Firefox
- Desktop Chrome (częściowo), Edge

```typescript
// PRZED
if (canUseWebShare() && isIOSDevice()) {

// PO - na wszystkich urządzeniach z Web Share API
if (canUseWebShare()) {
```

Dodać funkcję wykrywania urządzeń mobilnych:

```typescript
export const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0);
};
```

### 2. Zaktualizować `SocialShareDialog.tsx`

Dodać import i zmienić `handleDownload`:

```typescript
import { shareOrDownloadImage, isMobileDevice, canUseWebShare } from '@/lib/imageShareUtils';

const handleDownload = async () => {
  const success = await shareOrDownloadImage(imageUrl, `${title}.jpg`);
  
  if (success) {
    toast({
      title: isMobileDevice() && canUseWebShare() ? 'Udostępnij lub zapisz' : t('dashboard.download'),
      description: title,
    });
  }
};
```

Zmienić przycisk:

```tsx
<Button onClick={handleDownload} className="flex-1 gap-2">
  {isMobileDevice() && canUseWebShare() ? (
    <>
      <Share2 className="h-4 w-4" />
      Zapisz do galerii
    </>
  ) : (
    <>
      <Download className="h-4 w-4" />
      {t('dashboard.download')}
    </>
  )}
</Button>
```

---

## Szczegółowe zmiany

### Plik: `src/lib/imageShareUtils.ts`

| Zmiana | Opis |
|--------|------|
| Dodać `isMobileDevice()` | Wykrywanie wszystkich urządzeń mobilnych |
| Usunąć `&& isIOSDevice()` z warunku | Web Share API na wszystkich wspieranych przeglądarkach |
| Zaktualizować komentarze | Zmienić "iOS" na "mobile devices" |

### Plik: `src/components/share/SocialShareDialog.tsx`

| Lokalizacja | Zmiana |
|-------------|--------|
| Import | Dodać `shareOrDownloadImage, isMobileDevice, canUseWebShare` |
| `handleDownload()` | Zmienić na async, użyć `shareOrDownloadImage()` |
| Przycisk (linia ~132) | Warunkowa ikona i tekst dla mobile |

---

## Rezultat

Po zmianach:

| Urządzenie | Zachowanie |
|------------|------------|
| **iPhone (Safari, Chrome)** | Native share sheet → "Zapisz obraz" do Photos |
| **Android (Chrome, Samsung)** | Native share sheet → opcje zapisu/udostępnienia |
| **Desktop (Chrome, Edge)** | Native share sheet (jeśli wspierane) lub standardowe pobieranie |
| **Desktop (Firefox, starsze)** | Standardowe pobieranie do Downloads |

Wszystkie urządzenia mobilne z Web Share API dostaną natywny sheet z opcją zapisu do galerii zdjęć.

