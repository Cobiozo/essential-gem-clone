

# Plan: Mobile fullscreen fix + chat bubble notifications

## Problems identified

1. **Fullscreen doesn't work on mobile** — iOS Safari doesn't support `Element.requestFullscreen()` on a div container. Only `video.webkitEnterFullscreen()` works on iOS. The current code only tries `container.requestFullscreen()`.

2. **No chat bubble when chat is collapsed** — When chat is closed, new messages appear silently. Users have no idea someone wrote something until they open the chat panel.

## Changes

### 1. Fix fullscreen for mobile (`AutoWebinarPlayerControls.tsx`)

- Pass `videoRef` to the fullscreen logic (already passed as prop).
- In `toggleFullscreen()`, detect iOS/Safari and use `videoRef.current.webkitEnterFullscreen()` as fallback when `container.requestFullscreen()` fails.
- Also listen for `webkitfullscreenchange` event for iOS state tracking.
- Increase button z-index to ensure it's tappable on mobile.

### 2. Chat bubble notifications (`AutoWebinarFakeChat.tsx`)

- Track `lastSeenCount` — the message count when the user last had the chat open.
- When chat is closed and `messages.length > lastSeenCount`, show a floating bubble with the latest message's author and content.
- Bubble appears with a slide-in animation, auto-disappears after 3 seconds.
- Position: bottom-right, above the chat toggle button.
- On tap: opens the chat panel.
- Multiple messages arriving rapidly: show only the latest one, reset the 3s timer.

### 3. Mobile UX polish (`AutoWebinarEmbed.tsx`)

- Ensure the video container uses `relative` positioning with proper z-index layering so fullscreen button and chat bubble don't conflict.
- On mobile, position chat toggle button higher to avoid overlap with player controls bar.

## Files to modify

| File | Change |
|------|--------|
| `AutoWebinarPlayerControls.tsx` | iOS fullscreen fallback via `webkitEnterFullscreen` |
| `AutoWebinarFakeChat.tsx` | Add floating bubble notification for new messages when chat is collapsed |

