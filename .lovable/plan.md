

# Fix: "Cannot read properties of null (reading 'includes')" in SecureMedia

## Problem
The error `Cannot read properties of null (reading 'includes')` crashes the page when viewing a video in Zdrowa Wiedza. The `signedUrl` state in `SecureMedia.tsx` is initialized as `''` but can be set to `null` via `setSignedUrl(data.signedUrl)` when Supabase returns `null` for the signed URL, or when `mediaUrl` prop itself is `null`.

## Fix

### `src/components/SecureMedia.tsx`
Add null-safe access (`signedUrl?.includes` or `(signedUrl || '')`) in all 6 places where `signedUrl.includes(...)` is used in the render JSX (lines 1606, 1612, 1695, 1702, 1778, 1783). This prevents the crash when signedUrl is null/undefined.

Additionally, guard `setSignedUrl(data.signedUrl)` calls to never set null: `setSignedUrl(data.signedUrl || '')`.

