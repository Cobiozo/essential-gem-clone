

## Analysis Results

### 1. Fullscreen controls bar
The `AutoWebinarPlayerControls` renders a full-width bar (`absolute bottom-0 left-0 right-0`) with black background that covers the chat area below. Need to change it to a single floating button in the bottom-left corner.

### 2. Participant count position
Currently rendered inside the video container at `absolute top-2 right-2`. Need to move it to the header area, next to or above the "NA ŻYWO" badge.

### 3. Tracking analysis
Data in `auto_webinar_views`:
- **30 total records**, 15 guests, 13 with guest email, 13 with watch duration > 0, 11 with `left_at` set
- **Problem 1: Race condition** — duplicate views created milliseconds apart for the same session (e.g., two inserts at `10:48:57.881` and `10:48:58.159`). The `if (viewId.current) return` guard fails because two async calls fire before either completes.
- **Problem 2: Orphaned records** — many views have `watch_duration_seconds: 0` and `left_at: null`. The `endView` cleanup in the useEffect return runs, but the async call may not complete before unmount.
- **Problem 3: Guest email missing** — 2 guest views (15 guests - 13 with email) lost the email, likely because `guestEmail` wasn't resolved yet when `createView` fired.

## Plan

### Step 1: Fix fullscreen controls (AutoWebinarPlayerControls.tsx)
- Remove the full-width bar container
- Render only a floating button positioned at `absolute bottom-2 left-2` with rounded background
- Keep all fullscreen toggle logic unchanged

### Step 2: Move participant count to header (AutoWebinarEmbed.tsx)
- Remove `AutoWebinarParticipantCount` from inside the video container (lines 342-349)
- Add it in the header section (around line 311-316), positioned next to or above the "NA ŻYWO" badge

### Step 3: Fix tracking race condition (useAutoWebinarTracking.ts)
- Add a `creatingRef` boolean flag to prevent concurrent `createView` calls
- Set it `true` before the insert, reset on completion — this eliminates duplicate records
- Ensure `endView` uses `navigator.sendBeacon` or `fetch keepalive` as fallback (already done for `beforeunload`, but the regular `endView` in useEffect cleanup should also be more resilient)

### Technical details

**Controls change:**
```
Before: full-width black bar at bottom
After:  single 44x44 rounded button, bottom-left corner, semi-transparent background
```

**Participant count move:**
```
Before: inside video, top-right overlay
After:  in header bar, between title and "NA ŻYWO" badge
```

**Tracking fix:**
```
Before: two concurrent createView() calls → 2 DB rows
After:  mutex ref prevents second call until first resolves
```

