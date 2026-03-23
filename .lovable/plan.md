

# Fix: Lesson file download button not working

## Problem

The `ActionButton` component in `TrainingModule.tsx` (line 1158-1169) handles file downloads by calling `supabase.storage.from('training-media').createSignedUrl(button.file_url, 3600)`. However, `MediaUpload` stores a **full URL** (from VPS upload) in `file_url`, not a Supabase storage path. The `createSignedUrl` call fails silently because the path is invalid, so nothing downloads.

## Solution

### File: `src/pages/TrainingModule.tsx` (lines 1158-1169)

Modify the `type === 'file'` handler to:
1. Check if `file_url` is already a full URL (starts with `http`)
2. If yes — download directly using that URL (create `<a>` element with `download` attribute)
3. If no — keep existing `createSignedUrl` logic as fallback for any legacy Supabase storage paths

```tsx
if (button.type === 'file' && button.file_url) {
  // If file_url is already a full URL, download directly
  if (button.file_url.startsWith('http')) {
    const link = document.createElement('a');
    link.href = button.file_url;
    link.download = button.file_name || 'file';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  // Fallback: Supabase storage path
  const { data } = await supabase.storage
    .from('training-media')
    .createSignedUrl(button.file_url, 3600);
  if (data?.signedUrl) {
    const link = document.createElement('a');
    link.href = data.signedUrl;
    link.download = button.file_name || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
}
```

### Files to change

| File | Change |
|------|--------|
| `src/pages/TrainingModule.tsx` | Fix file download to handle full URLs directly, keep signed URL as fallback |

