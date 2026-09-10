/**
 * STAGE 6 DIAGNOSTIC — state update tracer (temporary, measurement only).
 *
 * Activated exclusively via ?stage6TraceUpdates=1. Without the flag nothing in
 * this module runs and no React internals are touched (zero runtime overhead).
 *
 * What it does:
 *  - wraps the React hooks dispatcher (useState / useReducer /
 *    useSyncExternalStore) so that every setState / dispatch / store
 *    notification increments an aggregated counter,
 *  - attributes each counter to an "owner" derived once from a captured stack
 *    (first invocation only — the hot path is a single ++),
 *  - counts commits via onCommitFiberRoot WITHOUT any fiber walk,
 *  - groups commits into bursts (gap < 100 ms).
 *
 * Numbers are APPROXIMATE: React may batch several updates into one commit or
 * bail out entirely, and production names are minified.
 *
 * Console API:
 *   __PURE_STAGE6_UPDATE_REPORT()  -> aggregated report (also stops after 180 s)
 *   __PURE_STAGE6_UPDATE_RESET()   -> clears counters, restarts the window
 */

const AUTO_STOP_MS = 180_000;
const BURST_GAP_MS = 100;

type SourceKind = 'useState' | 'useReducer' | 'useSyncExternalStore';

interface SourceStat {
  key: string;
  kind: SourceKind;
  owner: string;
  count: number;
  firstAt: number;
  lastAt: number;
}

const stats = new Map<string, SourceStat>();
let commitTimes: number[] = [];
let startedAt = 0;
let stopped = false;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Trim a captured stack down to the first frames that are not this module. */
const ownerFromStack = (kind: SourceKind): string => {
  let raw = '';
  try {
    raw = new Error().stack || '';
  } catch {
    return `${kind}@unknown`;
  }
  const frames = raw
    .split('\n')
    .slice(1)
    .map(l => l.trim())
    .filter(l => l && !l.includes('stage6UpdateTracer'));
  return frames.slice(0, 4).join(' <- ') || `${kind}@unknown`;
};

const record = (kind: SourceKind, holder: { k?: string }) => {
  if (stopped) return;
  const t = now();
  if (t - startedAt > AUTO_STOP_MS) {
    stopped = true;
    return;
  }
  let key = holder.k;
  if (!key) {
    key = `${kind} | ${ownerFromStack(kind)}`;
    holder.k = key;
  }
  const existing = stats.get(key);
  if (existing) {
    existing.count += 1;
    existing.lastAt = t;
  } else {
    stats.set(key, { key, kind, owner: key.slice(key.indexOf('|') + 2), count: 1, firstAt: t, lastAt: t });
  }
};

const wrapDispatcher = (dispatcher: any) => {
  const origUseState = dispatcher.useState;
  const origUseReducer = dispatcher.useReducer;
  const origUseSyncExternalStore = dispatcher.useSyncExternalStore;

  if (typeof origUseState === 'function') {
    dispatcher.useState = function (this: unknown, ...args: unknown[]) {
      const res = origUseState.apply(this, args);
      const setter = res[1];
      if (typeof setter === 'function' && !setter.__stage6) {
        const holder: { k?: string } = {};
        const wrapped: any = (...a: unknown[]) => {
          record('useState', holder);
          return setter(...a);
        };
        wrapped.__stage6 = true;
        return [res[0], wrapped];
      }
      return res;
    };
  }

  if (typeof origUseReducer === 'function') {
    dispatcher.useReducer = function (this: unknown, ...args: unknown[]) {
      const res = origUseReducer.apply(this, args);
      const dispatch = res[1];
      if (typeof dispatch === 'function' && !dispatch.__stage6) {
        const holder: { k?: string } = {};
        const wrapped: any = (...a: unknown[]) => {
          record('useReducer', holder);
          return dispatch(...a);
        };
        wrapped.__stage6 = true;
        return [res[0], wrapped];
      }
      return res;
    };
  }

  if (typeof origUseSyncExternalStore === 'function') {
    dispatcher.useSyncExternalStore = function (this: unknown, subscribe: any, ...rest: unknown[]) {
      const holder: { k?: string } = {};
      const wrappedSubscribe = (onStoreChange: () => void) =>
        subscribe(() => {
          record('useSyncExternalStore', holder);
          onStoreChange();
        });
      return origUseSyncExternalStore.call(this, wrappedSubscribe, ...(rest as []));
    };
  }

  dispatcher.__stage6Wrapped = true;
  return dispatcher;
};

const installDispatcherHook = (React: any): boolean => {
  const internals =
    React?.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
    React?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  const holder = internals?.ReactCurrentDispatcher ?? internals;
  if (!holder || !('current' in holder)) return false;

  const cache = new WeakMap<object, object>();
  let value = holder.current;
  try {
    Object.defineProperty(holder, 'current', {
      configurable: true,
      get: () => value,
      set: (next: any) => {
        if (next && typeof next === 'object') {
          const cached = cache.get(next);
          if (cached) {
            value = cached;
            return;
          }
          try {
            const clone: any = Object.create(Object.getPrototypeOf(next));
            Object.assign(clone, next);
            wrapDispatcher(clone);
            cache.set(next, clone);
            cache.set(clone, clone);
            value = clone;
            return;
          } catch {
            /* fall through */
          }
        }
        value = next;
      },
    });
  } catch {
    return false;
  }
  return true;
};

const installCommitCounter = () => {
  const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!hook) return false;
  const orig = hook.onCommitFiberRoot;
  hook.onCommitFiberRoot = function (this: unknown, ...args: unknown[]) {
    if (!stopped) commitTimes.push(now());
    if (typeof orig === 'function') return orig.apply(this, args);
  };
  return true;
};

const buildReport = () => {
  const elapsedMs = Math.min(now() - startedAt, AUTO_STOP_MS);
  const minutes = elapsedMs / 60000;
  const sources = Array.from(stats.values()).sort((a, b) => b.count - a.count);
  const totalUpdates = sources.reduce((s, x) => s + x.count, 0);

  const bursts: Array<{ startAt: number; commits: number; durationMs: number }> = [];
  let cur: { startAt: number; commits: number; last: number } | null = null;
  for (const t of commitTimes) {
    if (cur && t - cur.last < BURST_GAP_MS) {
      cur.commits += 1;
      cur.last = t;
    } else {
      if (cur) bursts.push({ startAt: Math.round(cur.startAt), commits: cur.commits, durationMs: Math.round(cur.last - cur.startAt) });
      cur = { startAt: t, commits: 1, last: t };
    }
  }
  if (cur) bursts.push({ startAt: Math.round(cur.startAt), commits: cur.commits, durationMs: Math.round(cur.last - cur.startAt) });

  return {
    approximate: true,
    note: 'Counts are setState/dispatch/store-notification calls, not commits. React may batch or bail out. Names may be minified.',
    elapsedSeconds: Math.round(elapsedMs / 1000),
    totalUpdates,
    updatesPerMinute: minutes > 0 ? Math.round(totalUpdates / minutes) : 0,
    totalCommits: commitTimes.length,
    commitsPerMinute: minutes > 0 ? Math.round(commitTimes.length / minutes) : 0,
    topSources: sources.slice(0, 25).map(s => ({
      kind: s.kind,
      owner: s.owner,
      updates: s.count,
      updatesPerMinute: minutes > 0 ? Math.round(s.count / minutes) : 0,
      sharePct: totalUpdates ? Math.round((s.count / totalUpdates) * 1000) / 10 : 0,
    })),
    topBursts: bursts.sort((a, b) => b.commits - a.commits).slice(0, 15),
  };
};

export const installStage6UpdateTracer = (React: unknown) => {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (w.__PURE_STAGE6_UPDATE_REPORT) return;

  startedAt = now();

  // Assign the console API FIRST so it exists even if hook installation throws.
  w.__PURE_STAGE6_UPDATE_TRACER_ACTIVE = true;
  w.__PURE_STAGE6_UPDATE_STATUS = { installedAt: new Date().toISOString(), dispatcherHook: false, commitHook: false };

  let dispatcherOk = false;
  let commitsOk = false;
  try {
    dispatcherOk = installDispatcherHook(React);
  } catch {
    dispatcherOk = false;
  }
  try {
    commitsOk = installCommitCounter();
  } catch {
    commitsOk = false;
  }
  w.__PURE_STAGE6_UPDATE_STATUS.dispatcherHook = dispatcherOk;
  w.__PURE_STAGE6_UPDATE_STATUS.commitHook = commitsOk;

  (window as any).__PURE_STAGE6_UPDATE_REPORT = () => {
    stopped = true;
    const report = { dispatcherHook: dispatcherOk, commitHook: commitsOk, ...buildReport() };
    (window as any).__PURE_STAGE6_LAST_UPDATE_REPORT = report;
    console.log('[stage6] update report', report);
    console.table(report.topSources);
    return report;
  };

  (window as any).__PURE_STAGE6_UPDATE_RESET = () => {
    stats.clear();
    commitTimes = [];
    startedAt = now();
    stopped = false;
    console.log('[stage6] tracer reset');
  };

  console.log(
    `[stage6] update tracer active (dispatcher=${dispatcherOk}, commits=${commitsOk}). ` +
      'Wait ~120 s idle, then call __PURE_STAGE6_UPDATE_REPORT().',
  );
};
