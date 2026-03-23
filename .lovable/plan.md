

# Fix: Academy stability issues on iOS PWA

## Problems Identified

After deep analysis of the code, I found **5 root causes** for the reported issues:

### 1. Lesson completion reverts after refresh
**Root cause**: `saveProgressWithRetry` (line 596-607) does **NOT** protect against overwriting `is_completed=true` with `false`. While `saveProgressWithPosition` (line 670-677) skips already-completed lessons, the periodic auto-save via `handleVideoTimeUpdate` (line 756-758) calls `saveProgressWithPosition` which calls `saveProgressWithRetry` with `isCompleted` calculated from current video position. If the user rewatches a video and the position is less than duration, `isCompleted` becomes `false`, and the upsert overwrites the database.

Additionally, `beforeunload` handler (line 505-568) also recalculates `isCompleted` and can overwrite with `false`.

### 2. Lesson navigation confusion
**Root cause**: `jumpToLesson` (line 1080-1133) blocks access if the previous lesson isn't completed, BUT `goToNextLesson` (line 892-1039) always marks the current lesson as completed when navigating forward - even if the video hasn't been fully watched. This creates an inconsistency where clicking "Następna" always works but clicking a lesson in the sidebar doesn't.

### 3. Video stuck loading on iOS PWA
**Root cause A**: Token proxy flow (`generateMediaToken` -> `resolveStreamUrl`) makes two sequential network calls before the video URL is set. On iOS PWA with poor connectivity, either call can timeout/fail silently.

**Root cause B**: The `videoReady` state is only set via `canplay`/`loadeddata` events. On iOS Safari in PWA mode, these events can be delayed or never fire if the device is low on memory. The video stays hidden (opacity: 0) indefinitely with only a spinner showing.

**Root cause C**: iOS aggressively pauses video when `visibilitychange` fires (e.g., notification banner pull-down). After resume, the video may need to rebuffer but the `canplayGuardRef` blocks the waiting handler, creating a deadlock.

## Solution

### File 1: `src/pages/TrainingModule.tsx`

**Fix A — Protect completed status in `saveProgressWithRetry`**:
Add a check at the beginning of `saveProgressWithRetry` — if the lesson is already completed in `progressRef`, skip the save entirely (same pattern as `saveProgressWithPosition` line 670).

**Fix B — Protect `beforeunload` upsert payload**:
The beforeunload handler already has protection (line 510-515), but the `visibilitychange` handler (line 832-840) calls `saveProgressWithPosition` which CAN overwrite. Need to ensure `saveProgressWithRetry` itself is the final guard.

**Fix C — Database-level protection**:
Add a SQL migration with a trigger that prevents `is_completed` from being set to `false` if it's currently `true`. This is the ultimate safety net.

**Fix D — Consistent lesson navigation**:
Allow `jumpToLesson` to navigate to any lesson that the user has already started (has any progress record), not just lessons after completed ones.

### File 2: `src/components/SecureMedia.tsx`

**Fix E — iOS PWA video loading timeout**:
Add a safety timeout (8 seconds) that forces `videoReady = true` even if `canplay`/`loadeddata` events haven't fired. On iOS PWA, this prevents the infinite loading spinner.

**Fix F — Token proxy resilience**:
Add retry logic (2 attempts) around the `generateMediaToken` + `resolveStreamUrl` chain. If both fail, fall back to direct URL.

**Fix G — iOS visibility recovery**:
After `visibilitychange` returns to visible on mobile, temporarily disable the canplay guard and force a `video.play()` attempt after a short delay (500ms).

### File 3: SQL Migration

**Fix H — Database trigger to protect completion status**:
```sql
CREATE OR REPLACE FUNCTION protect_training_completion()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Never allow is_completed to revert from true to false
  IF OLD.is_completed = true AND NEW.is_completed = false THEN
    NEW.is_completed = true;
    NEW.completed_at = OLD.completed_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_training_completion
  BEFORE UPDATE ON training_progress
  FOR EACH ROW
  EXECUTE FUNCTION protect_training_completion();
```

### Files to change

| File | Changes |
|------|---------|
| `src/pages/TrainingModule.tsx` | Add completed-lesson guard in `saveProgressWithRetry`; fix `jumpToLesson` access logic |
| `src/components/SecureMedia.tsx` | Add 8s videoReady timeout for iOS PWA; add token retry; fix iOS visibility recovery |
| SQL Migration | Add trigger preventing `is_completed` from reverting to false |

### Summary of fixes
- **Completion reverts**: Triple protection — client-side guard in `saveProgressWithRetry`, client-side guard in `saveProgressWithPosition` (already exists), and database trigger as safety net
- **Navigation**: More permissive `jumpToLesson` that allows accessing any lesson the user has started
- **Video loading stuck**: Timeout fallback + token retry + iOS visibility recovery

