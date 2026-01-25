# Plan: (Completed)

The previous plan has been fully implemented. All features are now active:

## Implemented Features

### ✅ Video Activity Tracking (Auto-logout fix)
- `SecureMedia.tsx` emits `video-activity` events every 10 seconds during playback
- `useInactivityTimeout.ts` listens for these events and resets the timer
- Added 1-minute buffer in visibility change handler

### ✅ One-time Automatic Tutorial
- Tutorial only shows automatically once (first login after registration)
- Uses `tutorial_shown_once` column in profiles table
- Subsequent logins won't trigger automatic tutorial

### ✅ Manual Tutorial Trigger
- HelpCircle icon added to topbar (next to theme selector)
- Clicking it dispatches `startOnboardingTour` event
- Users can restart tutorial anytime
