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

/**
 * stage6NoUnifiedChat=1 disables the useUnifiedChat mechanism (fetches, polling,
 * realtime subscriptions and all resulting state updates) by treating the hook
 * as if there were no authenticated user. Diagnostic only.
 */
export const STAGE6_NO_UNIFIED_CHAT = hasFlag('stage6NoUnifiedChat');

/**
 * stage6NoTranslateDetector=1 skips mounting BrowserTranslationWarning entirely,
 * so useBrowserTranslationDetector never runs (no MutationObserver, no interval).
 * Diagnostic only.
 */
export const STAGE6_NO_TRANSLATE_DETECTOR = hasFlag('stage6NoTranslateDetector');

/**
 * stage6TraceUpdates=1 installs a temporary state-update tracer (wraps the React
 * hooks dispatcher and counts setState/dispatch/store notifications, plus a
 * commit counter). Diagnostic only; nothing runs without the flag.
 */
/**
 * The tracer flag is sticky for the session: the dashboard route can redirect
 * (auth / guards) and drop the query string before main.tsx logic is observed
 * by the user, so once seen we persist it in sessionStorage.
 */
const hasStickyFlag = (name: string): boolean => {
  if (typeof window === 'undefined') return false;
  const key = `__${name}`;
  try {
    if (hasFlag(name)) {
      window.sessionStorage.setItem(key, '1');
      return true;
    }
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return hasFlag(name);
  }
};

export const STAGE6_TRACE_UPDATES = hasStickyFlag('stage6TraceUpdates');
