

# Fix: QR code and image rendering in personalized PDF (Edge Function)

## Root Causes (from logs)

**QR Code error**: `Error: You need to specify a canvas element`
- `qrcode@1.5.3` browser bundle uses `toDataURL()` which requires an HTML Canvas — not available in Deno runtime
- Fix: Use `QRCode.toString()` with `type: 'svg'` output, then convert SVG to a simple PNG using pdf-lib's SVG path drawing, OR switch to generating a QR as a raw matrix and drawing rectangles directly in pdf-lib

**Image error**: `Error: SOI not found in JPEG`
- The `drawImageElement` function falls back to `embedJpg()` for any non-PNG content-type, but the image might be WebP, SVG, or the content-type header might be wrong/missing
- Fix: Detect format from actual bytes (magic bytes) instead of relying on content-type header, and add WebP-to-PNG conversion or skip unsupported formats gracefully

## Changes

### File: `supabase/functions/save-partner-lead/index.ts`

**QR Code fix** (lines 491-522):
- Replace `QRCode.toDataURL()` with raw QR matrix generation: `QRCode.create(text)` returns a modules array
- Draw QR manually using pdf-lib: create a small PDFDocument page, draw black rectangles for each QR module, embed as image
- Alternative (simpler): use a server-side QR API like `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=...` to fetch a PNG, then embed it with `embedPng()`
- **Recommended approach**: Use the free QR API — minimal code change, reliable PNG output

**Image fix** (lines 457-489):
- Add magic byte detection: check first bytes of `imgBytes` for PNG signature (`\x89PNG`), JPEG (`\xFF\xD8\xFF`), or other formats
- If bytes indicate PNG → `embedPng()`, if JPEG → `embedJpg()`, otherwise → skip with warning log
- Remove reliance on `content-type` header which can be unreliable

**Redeploy**: `save-partner-lead`

## Technical Details

QR via API approach (line 504 replacement):
```text
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&format=png&data=${encodeURIComponent(resolvedContent)}`;
const qrResp = await fetch(qrUrl);
const qrBytes = new Uint8Array(await qrResp.arrayBuffer());
const qrImg = await pdfDoc.embedPng(qrBytes);
```

Image magic bytes detection:
```text
function detectImageFormat(bytes: Uint8Array): 'png' | 'jpeg' | null {
  if (bytes[0]===0x89 && bytes[1]===0x50) return 'png';
  if (bytes[0]===0xFF && bytes[1]===0xD8) return 'jpeg';
  return null;
}
```

| File | Change |
|------|--------|
| `supabase/functions/save-partner-lead/index.ts` | Fix QR generation (use API), fix image format detection (magic bytes) |
| Redeploy: `save-partner-lead` | Required |

