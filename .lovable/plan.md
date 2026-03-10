

# Fix: Clipboard error on iOS Safari after async OTP generation

## Problem
On iOS Safari, `navigator.clipboard.writeText()` (and even the textarea fallback) fails when called **after** an async operation (API call). Safari requires clipboard writes to happen in the **synchronous call stack** of a user gesture. The async `supabase.functions.invoke()` breaks this chain.

Error: *"The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission."*

## Affected files
1. `src/pages/HealthyKnowledge.tsx` — `handleGenerateAndCopy` (line 137)
2. `src/components/dashboard/widgets/InfoLinksWidget.tsx` — `handleCopy` (line 82)

## Solution: ClipboardItem with pending Blob

Use the `ClipboardItem` API with a **Promise-based Blob** — this is the only approach that works on modern iOS Safari after async operations. The `ClipboardItem` is created synchronously (preserving user gesture), but its content is resolved asynchronously.

```typescript
// Create ClipboardItem synchronously (in user gesture stack)
const clipboardItem = new ClipboardItem({
  'text/plain': fetchOtp().then(text => new Blob([text], { type: 'text/plain' }))
});
await navigator.clipboard.write([clipboardItem]);
```

Fallback: If `ClipboardItem` is not available (older browsers), fall back to showing the text in a selectable textarea with a "Copy manually" instruction + toast.

### Changes per file

**HealthyKnowledge.tsx** — Refactor `handleGenerateAndCopy`:
- Create `ClipboardItem` with pending blob synchronously
- Resolve blob content from the API response
- Fallback: display text in the textarea (already in dialog) and prompt manual copy

**InfoLinksWidget.tsx** — Refactor `handleCopy` for OTP links:
- Same ClipboardItem pattern
- Fallback: show toast with the OTP code and a "tap to copy" action

### Shared utility
Add a new function `copyAfterAsync` to `src/lib/clipboardUtils.ts`:
```typescript
export async function copyAfterAsync(
  asyncFn: () => Promise<string>
): Promise<{ success: boolean; text: string }> {
  // Modern approach: ClipboardItem with pending blob
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    const textPromise = asyncFn();
    const item = new ClipboardItem({
      'text/plain': textPromise.then(t => new Blob([t], { type: 'text/plain' }))
    });
    const text = await textPromise;
    await navigator.clipboard.write([item]);
    return { success: true, text };
  }
  // Fallback: run async, then try legacy copy
  const text = await asyncFn();
  const success = await copyToClipboard(text);
  return { success, text };
}
```

Both components will use this utility and handle the `success: false` case with a user-facing fallback (showing the text to copy manually).

