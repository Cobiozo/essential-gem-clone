

# Fix: Download triggers popup blocker instead of downloading

## Problem
The `fetch()` call in the blob download approach fails due to CORS restrictions on the file's origin server. The fallback code uses `window.open(url, '_blank')`, which triggers the browser's popup blocker (visible in the screenshot: "Ta witryna próbuje otworzyć okno podręczne").

## Solution

### File: `src/pages/TrainingModule.tsx` (lines 1158-1184)

Two changes:
1. **Remove `window.open` fallback** — replace with a non-popup approach using `window.location.href` which navigates to the file URL directly (browsers will download binary files or display viewable ones without popup warning)
2. **Add CORS mode handling** — use `fetch(url, { mode: 'cors' })` and if that fails, try with `no-cors` won't work for blob, so the fallback should use a hidden `<a>` element *without* `target="_blank"` to avoid popup blockers entirely

Updated logic:
```tsx
if (button.type === 'file' && button.file_url) {
  try {
    let downloadUrl = button.file_url;
    
    if (!downloadUrl.startsWith('http')) {
      const { data } = await supabase.storage
        .from('training-media')
        .createSignedUrl(downloadUrl, 3600);
      if (!data?.signedUrl) return;
      downloadUrl = data.signedUrl;
    }
    
    // Try fetch-as-blob for forced download
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Fetch failed');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = button.file_name || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (error) {
    console.error('Download error:', error);
    // Fallback: use <a> without target="_blank" to avoid popup blocker
    const link = document.createElement('a');
    link.href = button.file_url;
    link.download = button.file_name || 'file';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  return;
}
```

Key difference: The fallback no longer uses `window.open` — it creates an `<a>` element without `target="_blank"`, which avoids popup blockers entirely. The `download` attribute hints the browser to download rather than navigate.

| File | Change |
|------|--------|
| `src/pages/TrainingModule.tsx` | Replace `window.open` fallback with hidden `<a>` click (no popup) |

