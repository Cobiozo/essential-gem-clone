

# Fix: Selecting broadcast channel opens previous DM instead

## Problem
When you select a broadcast channel (e.g. "Liderzy"), the previous direct message conversation (e.g. Dawid Kowalczyk) stays active and is displayed instead of the channel.

## Root Cause
In `useUnifiedChat.ts`, the `selectChannel` function sets the channel ID but **never clears** `selectedDirectUserId`. Meanwhile `selectDirectMember` correctly clears `selectedChannelId`. Since the UI checks `selectedDirectUserId` first (via `effectiveDirectMember`), the stale DM takes priority over the newly selected channel.

## Fix
**File: `src/hooks/useUnifiedChat.ts`** — line ~966

Add `setSelectedDirectUserId(null)` inside `selectChannel`:

```typescript
const selectChannel = useCallback((channelId: string) => {
  setSelectedChannelId(channelId);
  setSelectedDirectUserId(null);  // ← clear DM selection
  fetchMessages(channelId);
  // ...rest unchanged
}, [fetchMessages, channels, markChannelAsRead]);
```

One-line fix. Both `ChatPanelContent` and `MessagesPage` use the same hook, so this fixes the bug everywhere (sidebar, PiP, and full messages page).

