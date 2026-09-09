/**
 * STAGE 6 DIAGNOSTIC FLAGS (temporary, measurement only).
 *
 * Activated exclusively via URL query params, e.g. /dashboard?stage6NoClocks=1
 * Without the flag the app behaves exactly as before.
 *
 * stage6NoClocks=1 disables ONLY the three 1-second state updates:
 *  - useInactivityTimeout display tick (session timeout/logout logic untouched)
 *  - SessionTimer countdown subscription/rendering
 *  - WelcomeWidget clock interval
 */
const hasFlag = (name: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).has(name);
  } catch {
    return false;
  }
};

export const STAGE6_NO_CLOCKS = hasFlag('stage6NoClocks');
