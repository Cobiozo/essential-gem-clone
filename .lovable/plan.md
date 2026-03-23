

# Fix: Force file download instead of opening in browser tab

## Problem
The current implementation creates an `<a>` element with `download` attribute and `target="_blank"`. For cross-origin URLs, browsers ignore the `download` attribute and simply open the file in a new tab. The user wants clicking the attachment button to always trigger a file download to the device.

## Solution

### File: `src/pages/TrainingModule.tsx` (lines 1158-1181)

Replace the direct `<a>` link approach with a **fetch-as-blob** strategy:

1. For full HTTP URLs: fetch the file as a blob, create a blob URL, then trigger download via `<a>` with the blob URL (same-origin, so `download` attribute works)
2. For Supabase storage paths: same blob approach after getting the signed URL
3. Remove `target="_blank"` — we never want to open in a new tab

```tsx
if (button.type === 'file' && button.file_url) {
  try {
    let downloadUrl = button.file_url;
    
    if (!downloadUrl.startsWith('http')) {
      // Supabase storage path — get signed URL first
      const { data } = await supabase.storage
        .from('training-media')
        .createSignedUrl(downloadUrl, 3600);
      if (!data?.signedUrl) return;
      downloadUrl = data.signedUrl;
    }
    
    // Fetch as blob to force download (bypasses cross-origin download attribute issue)
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = button.file_name || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download error:', error);
    // Fallback: open in new tab if blob fetch fails
    window.open(button.file_url, '_blank');
  }
  return;
}
```

### Files to change

| File | Change |
|------|--------|
| `src/pages/TrainingModule.tsx` | Replace `<a>` link download with fetch-as-blob approach to force actual file download |

