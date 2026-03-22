

# Fix: WebP image support in personalized PDF generation

## Problem
Uploaded image is WebP format (magic bytes: `RIFF`). The `detectImageFormat` function only recognizes PNG and JPEG, so WebP images are skipped with a warning log.

`pdf-lib` does not support WebP natively — it only accepts PNG and JPEG.

## Solution
Convert WebP images to PNG on-the-fly before embedding in the PDF. Two approaches:

**Approach: Use an image proxy/conversion API**
- Detect WebP from magic bytes (`0x52, 0x49, 0x46, 0x46` = "RIFF")
- When WebP is detected, re-fetch the image through a conversion service, or use Supabase Storage's built-in **image transformation** feature which can convert WebP to PNG:
  `{url}?width=1600&format=png`
- Supabase Storage supports `render/image` endpoint with format conversion

**Recommended**: Use Supabase Storage image transform since the images are already hosted there. Simply append `?width=1600&format=origin` won't help — but the **render endpoint** does: replace `/object/public/` with `/render/image/public/` and add `?format=png`.

## Changes

### File: `supabase/functions/save-partner-lead/index.ts`

1. **Update `detectImageFormat`** — add WebP detection:
   - Check for RIFF header (`0x52, 0x49, 0x46, 0x46`) → return `'webp'`

2. **Update `drawImageElement`** — handle WebP conversion:
   - If format is `'webp'` and URL is from Supabase Storage, re-fetch using the render/image endpoint with `?format=png`
   - If format is `'webp'` and URL is external, use a public conversion proxy (e.g., `https://wsrv.nl/?url=...&output=png`)
   - After re-fetch, embed as PNG

3. **Redeploy** `save-partner-lead`

## Technical Detail

```text
// detectImageFormat update:
if (bytes[0]===0x52 && bytes[1]===0x49 && bytes[2]===0x46 && bytes[3]===0x46) return 'webp';

// drawImageElement WebP handling:
if (format === 'webp') {
  // Option A: Supabase transform
  const pngUrl = el.src.replace('/object/public/', '/render/image/public/') + '?format=png';
  // Option B: wsrv.nl proxy
  const pngUrl = `https://wsrv.nl/?url=${encodeURIComponent(el.src)}&output=png`;
  const pngResp = await fetch(pngUrl);
  imgBytes = new Uint8Array(await pngResp.arrayBuffer());
  img = await pdfDoc.embedPng(imgBytes);
}
```

| File | Change |
|------|--------|
| `supabase/functions/save-partner-lead/index.ts` | Add WebP detection + conversion to PNG before embedding |
| Redeploy: `save-partner-lead` | Required |

