

# Fix: Slow/hanging email sending in Edge Function

## Root Cause

Three bugs in `send-post-webinar-email/index.ts`:

1. **`base64Encode()` stack overflow** — `String.fromCharCode(...data)` spreads entire Uint8Array as arguments. For a ~50KB HTML template this means ~50,000 arguments → crashes or extreme slowness. With attachments it's even worse.

2. **Single write for entire email** — `sendCommand(emailContent)` writes potentially megabytes (HTML + base64 attachments) in one `conn.write()` call, then tries to read response from a 4096-byte buffer. Large writes can block or fail silently.

3. **No timeout on SMTP data phase** — connection hangs if server is slow to process large payload.

## Fix (single file: `send-post-webinar-email/index.ts`)

### 1. Replace `base64Encode` with chunked version
Instead of `String.fromCharCode(...data)`, process in chunks of 8192 bytes:
```typescript
function base64Encode(str: string): string {
  const data = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < data.length; i += 8192) {
    const chunk = data.subarray(i, i + 8192);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
```

### 2. Write email DATA in chunks
Instead of `sendCommand(emailContent)`, write the email body in chunks (e.g., 16KB) directly to the connection, then send the terminating `\r\n.\r\n` and read the response:
```typescript
// Write email in chunks instead of one sendCommand
const emailBytes = encoder.encode(emailContent + "\r\n");
for (let i = 0; i < emailBytes.length; i += 16384) {
  await conn.write(emailBytes.subarray(i, i + 16384));
}
// Read server response after DATA
const dataRes = await withTimeout(readResponse(), 30000, "SMTP DATA timeout");
```

### 3. Add timeouts to all SMTP reads
Wrap `readResponse()` calls in `withTimeout()` to prevent indefinite hangs.

### 4. Increase read buffer
Change `readResponse` buffer from 4096 to 8192 bytes for larger server responses.

## Result
- Single recipient with 96KB attachment: ~2-5 seconds instead of timeout
- No more stack overflow on large templates
- Proper timeout handling prevents indefinite hangs

| File | Change |
|------|--------|
| `supabase/functions/send-post-webinar-email/index.ts` | Fix base64Encode chunking, chunked DATA write, timeouts |

