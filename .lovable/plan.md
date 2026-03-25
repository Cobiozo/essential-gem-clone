

# Fix: Clipboard API error on iOS Apple browsers (Zdrowa Wiedza share)

## Problem
On iOS Safari/Chrome/Firefox (all WebKit-based), clicking "Generuj kod i kopiuj" triggers the clipboard error: "The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission."

**Root cause in `clipboardUtils.ts`:**
1. `ClipboardItem` with a Promise-based blob fails on many iOS WebKit browsers (only works reliably in Safari 16.4+ and Brave)
2. When it fails, the fallback at line 112 calls `asyncFn()` **a second time**, generating a duplicate OTP
3. The `writePromise` rejection can become an **unhandled promise rejection** because `await textPromise` runs first — this surfaces as the browser error toast
4. The fallback `copyToClipboard()` also fails because gesture context is long lost

## Solution

### 1. Fix `clipboardUtils.ts` — prevent double API call and unhandled rejection

Rewrite `copyAfterAsync` to:
- Use `Promise.allSettled` to handle both promises safely (no unhandled rejection)
- If `ClipboardItem` fails but text resolved successfully, **don't re-call asyncFn** — use the already-resolved text with `copyToClipboard` fallback
- Only re-call `asyncFn` if the text promise itself failed (which shouldn't happen)

```
async function copyAfterAsync(asyncFn) {
  if (ClipboardItem && navigator.clipboard?.write) {
    let resolvedText = '';
    try {
      const textPromise = asyncFn();
      const blobPromise = textPromise.then(t => new Blob([t], { type: 'text/plain' }));
      const item = new ClipboardItem({ 'text/plain': blobPromise });
      const writePromise = navigator.clipboard.write([item]);
      
      // Await both, handling errors independently
      const [textResult, writeResult] = await Promise.allSettled([textPromise, writePromise]);
      
      if (textResult.status === 'fulfilled') resolvedText = textResult.value;
      if (writeResult.status === 'fulfilled') return { success: true, text: resolvedText };
      
      // Write failed but text succeeded — try legacy copy with existing text
      if (resolvedText) {
        const success = await copyToClipboard(resolvedText);
        return { success, text: resolvedText };
      }
    } catch { /* fall through */ }
  }
  
  // Full fallback
  const text = await asyncFn();
  const success = await copyToClipboard(text);
  return { success, text };
}
```

### 2. Update `HealthyKnowledge.tsx` — graceful fallback UX

When `copyAfterAsync` returns `success: false`, the dialog already stays open with "Kopiuj wiadomość" button. But we should:
- Show a gentle info toast instead of nothing: "Kod wygenerowany. Skopiuj wiadomość przyciskiem poniżej."
- The "Kopiuj wiadomość" button uses `handleManualCopy` which calls `copyToClipboard` in a **fresh gesture context** — this works on all iOS browsers

### 3. Update `handleManualCopy` — add `navigator.share` as primary on mobile

For iOS, `navigator.share({ text })` is more reliable than clipboard. Reorder:
- On mobile: try `navigator.share()` first, then `copyToClipboard` fallback
- On desktop: `copyToClipboard` only

## Files to change

| File | Change |
|---|---|
| `src/lib/clipboardUtils.ts` | Fix `copyAfterAsync` — `Promise.allSettled`, no double asyncFn call |
| `src/pages/HealthyKnowledge.tsx` | Info toast on fallback, improve `handleManualCopy` order for mobile |

