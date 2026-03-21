

# Fix: Desktop download opens Windows Share dialog instead of saving file

## Problem
On desktop, the `isMobileDevice()` function incorrectly returns `true` because it checks `'ontouchstart' in window` and `navigator.maxTouchPoints > 0` — both are true on modern desktop browsers (touchscreen laptops, or simply Chrome/Edge defaults). This causes the code to use `navigator.share()` instead of blob-based download, opening the Windows Share dialog instead of saving the file.

## Solution
Tighten the `isMobileDevice()` detection in `imageShareUtils.ts` to only match actual mobile user agents, removing the unreliable touch-based fallbacks. The UA regex already covers all mobile devices — the touch checks are redundant and cause false positives on desktop.

## File change

### `src/lib/imageShareUtils.ts`
- Remove `('ontouchstart' in window)` and `(navigator.maxTouchPoints > 0)` from `isMobileDevice()`
- Keep only the UA-based regex check which reliably distinguishes mobile from desktop
- This ensures desktop always uses `downloadViaBlob()` (direct file save)

```typescript
export const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};
```

No other files need changes — `SocialShareDialog.tsx`, `GalleryElement.tsx` all use the same `isMobileDevice()` function.

