/**
 * STAGE 6 DIAGNOSTIC — state update tracer (temporary, measurement only).
 *
 * Activated exclusively via ?stage6TraceUpdates=1. Without the flag nothing in
 * this module runs and no React internals are touched (zero runtime overhead).
 *
 * v3 — SOURCE IDENTIFICATION:
 *  - every hook instance is keyed by its (stable) setter/dispatch identity in a
 *    WeakMap, so counters accumulate per hook instance, not per stack string,
 *  - on first sight of a hook instance (budgeted, see CAPTURE_LIMIT) we capture:
 *      * the FULL stack of the hook call site (component render frame),
 *      * the owner fiber chain (component -> parents) via ReactCurrentOwner,
 *      * an approximate hook index (order of hooks within the same render frame),
 *      * a preview of the initial state value,
 *  - on the FIRST setter invocation we capture the FULL call stack of the caller
 *    (the timer / effect / subscription that triggers the update) plus previews
 *    of the first few values written.
 *
 * Hot path stays a single counter increment — no fiber walk, no per-update stack.
 *
 * Numbers are APPROXIMATE: React may batch several updates into one commit or
 * bail out entirely, and production names/locations are minified (map the
 * file:line offsets against the build sourcemap to resolve them).
 *
 * Console API:
 *   __PURE_STAGE6_UPDATE_REPORT()   -> aggregated report (also stops collection)
 *   __PURE_STAGE6_UPDATE_STACKS(n)  -> full stacks for the top n sources
 *   __PURE_STAGE6_UPDATE_RESET()    -> clears counters, restarts the window
 */

const AUTO_STOP_MS = 180_000;
const BURST_GAP_MS = 100;
/** Max hook instances for which we capture full stacks (mount-time cost only). */
const CAPTURE_LIMIT = 6000;
/** Max sampled value previews per source. */
const VALUE_SAMPLES = 3;

type SourceKind = 'useState' | 'useReducer' | 'useSyncExternalStore';

interface SourceStat {
  id: number;
  kind: SourceKind;
  /** Short one-line owner (best-effort component/frame). */
  owner: string;
  /** Component name chain from the fiber tree, if resolvable. */
  fiberPath: string | null;
  /** Full stack captured where the hook itself was called (render frame). */
  hookStack: string | null;
  /** Full stack captured at the first setter/dispatch invocation. */
  callerStack: string | null;
  /** Approximate index of this hook inside its component. */
  hookIndex: number | null;
  initialValue: string | null;
  valueSamples: string[];
  count: number;
  firstAt: number;
  lastAt: number;
}

let nextId = 1;
const stats: SourceStat[] = [];
const holders = new WeakMap<object, SourceStat & { wrapped?: unknown }>();
let captured = 0;
let commitTimes: number[] = [];
let startedAt = 0;
let stopped = false;
let reactInternals: any = null;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const rawStack = (): string => {
  try {
    return new Error().stack || '';
  } catch {
    return '';
  }
};

const cleanStack = (raw: string): string[] =>
  raw
    .split('\n')
    .slice(1)
    .map(l => l.trim())
    .filter(l => l && !l.includes('stage6UpdateTracer'));

const preview = (v: unknown): string => {
  try {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    const t = typeof v;
    if (t === 'function') return `function ${(v as { name?: string }).name || '(anon)'}`;
    if (t === 'object') {
      const ctor = (v as object).constructor?.name || 'Object';
      if (v instanceof Date) return `Date(${v.toISOString()})`;
      if (Array.isArray(v)) return `Array(${v.length})`;
      let json = '';
      try {
        json = JSON.stringify(v) || '';
      } catch {
        json = '';
      }
      return `${ctor} ${json.slice(0, 160)}`;
    }
    return `${t}: ${String(v).slice(0, 160)}`;
  } catch {
    return '(unreadable)';
  }
};

/** Best-effort component chain from the fiber currently rendering. */
const fiberPathFromOwner = (): string | null => {
  try {
    const owner = reactInternals?.ReactCurrentOwner?.current;
    if (!owner) return null;
    const names: string[] = [];
    let f: any = owner;
    let depth = 0;
    while (f && depth < 8) {
      const t = f.type ?? f.elementType;
      const n =
        (typeof t === 'string' && t) ||
        t?.displayName ||
        t?.name ||
        t?.render?.displayName ||
        t?.render?.name ||
        null;
      if (n) names.push(n);
      f = f.return;
      depth += 1;
    }
    return names.length ? names.join(' < ') : null;
  } catch {
    return null;
  }
};

// --- approximate hook index (same render frame => consecutive hooks) ---
let lastFrameKey = '';
let hookSeq = 0;
const nextHookIndex = (frames: string[]): number => {
  const key = frames[1] || frames[0] || '';
  if (key === lastFrameKey) {
    hookSeq += 1;
  } else {
    lastFrameKey = key;
    hookSeq = 0;
  }
  return hookSeq;
};

const createStat = (kind: SourceKind, initial: unknown): SourceStat => {
  const withCapture = captured < CAPTURE_LIMIT;
  let frames: string[] = [];
  if (withCapture) {
    captured += 1;
    frames = cleanStack(rawStack());
  }
  const stat: SourceStat = {
    id: nextId++,
    kind,
    owner: frames.slice(0, 3).join(' <- ') || `${kind}@uncaptured`,
    fiberPath: withCapture ? fiberPathFromOwner() : null,
    hookStack: withCapture ? frames.join('\n') : null,
    callerStack: null,
    hookIndex: withCapture ? nextHookIndex(frames) : null,
    initialValue: withCapture ? preview(initial) : null,
    valueSamples: [],
    count: 0,
    firstAt: 0,
    lastAt: 0,
  };
  stats.push(stat);
  return stat;
};

const record = (stat: SourceStat, args: unknown[]) => {
  if (stopped) return;
  const t = now();
  if (t - startedAt > AUTO_STOP_MS) {
    stopped = true;
    return;
  }
  if (stat.count === 0) {
    stat.firstAt = t;
    stat.callerStack = cleanStack(rawStack()).join('\n');
  }
  if (stat.valueSamples.length < VALUE_SAMPLES && args.length) {
    stat.valueSamples.push(preview(args[0]));
  }
  stat.count += 1;
  stat.lastAt = t;
};

const wrapDispatchLike = (kind: SourceKind, original: any, initial: unknown) => {
  const existing = holders.get(original);
  if (existing) return existing.wrapped;
  const stat = createStat(kind, initial);
  const wrapped: any = (...a: unknown[]) => {
    record(stat, a);
    return original(...a);
  };
  wrapped.__stage6 = true;
  holders.set(original, Object.assign(stat, { wrapped }) as any);
  return wrapped;
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
        return [res[0], wrapDispatchLike('useState', setter, res[0])];
      }
      return res;
    };
  }

  if (typeof origUseReducer === 'function') {
    dispatcher.useReducer = function (this: unknown, ...args: unknown[]) {
      const res = origUseReducer.apply(this, args);
      const dispatch = res[1];
      if (typeof dispatch === 'function' && !dispatch.__stage6) {
        return [res[0], wrapDispatchLike('useReducer', dispatch, res[0])];
      }
      return res;
    };
  }

  if (typeof origUseSyncExternalStore === 'function') {
    dispatcher.useSyncExternalStore = function (this: unknown, subscribe: any, ...rest: unknown[]) {
      let stat = holders.get(subscribe) as SourceStat | undefined;
      if (!stat) {
        stat = createStat('useSyncExternalStore', undefined);
        holders.set(subscribe, stat as any);
      }
      const target = stat;
      const wrappedSubscribe = (onStoreChange: () => void) =>
        subscribe(() => {
          record(target, []);
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
  reactInternals = internals ?? null;
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

const sorted = () => [...stats].sort((a, b) => b.count - a.count);

const buildReport = () => {
  const elapsedMs = Math.min(now() - startedAt, AUTO_STOP_MS);
  const minutes = elapsedMs / 60000;
  const sources = sorted().filter(s => s.count > 0);
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
    note: 'Counts are setState/dispatch/store-notification calls, not commits. Names/locations are minified — map file:line against the build sourcemap.',
    elapsedSeconds: Math.round(elapsedMs / 1000),
    totalUpdates,
    updatesPerMinute: minutes > 0 ? Math.round(totalUpdates / minutes) : 0,
    totalCommits: commitTimes.length,
    commitsPerMinute: minutes > 0 ? Math.round(commitTimes.length / minutes) : 0,
    topSources: sources.slice(0, 25).map(s => ({
      id: s.id,
      kind: s.kind,
      owner: s.owner,
      fiberPath: s.fiberPath,
      hookIndex: s.hookIndex,
      initialValue: s.initialValue,
      valueSamples: s.valueSamples,
      updates: s.count,
      updatesPerMinute: minutes > 0 ? Math.round(s.count / minutes) : 0,
      sharePct: totalUpdates ? Math.round((s.count / totalUpdates) * 1000) / 10 : 0,
      hookStackHead: s.hookStack ? s.hookStack.split('\n').slice(0, 6).join(' | ') : null,
      callerStackHead: s.callerStack ? s.callerStack.split('\n').slice(0, 6).join(' | ') : null,
    })),
    topBursts: bursts.sort((a, b) => b.commits - a.commits).slice(0, 15),
  };
};

const buildStacks = (n: number) =>
  sorted()
    .filter(s => s.count > 0)
    .slice(0, n)
    .map(s => ({
      id: s.id,
      kind: s.kind,
      updates: s.count,
      hookIndex: s.hookIndex,
      fiberPath: s.fiberPath,
      initialValue: s.initialValue,
      valueSamples: s.valueSamples,
      hookStack: s.hookStack,
      callerStack: s.callerStack,
    }));

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

  // NOTE: production build strips direct `console.*` calls (esbuild drop),
  // so log through window.console to keep diagnostic output visible.
  const log = (...a: unknown[]) => {
    try {
      w.console?.log(...a);
    } catch {
      /* noop */
    }
  };

  w.__PURE_STAGE6_UPDATE_REPORT = () => {
    stopped = true;
    const report = { dispatcherHook: dispatcherOk, commitHook: commitsOk, ...buildReport() };
    w.__PURE_STAGE6_LAST_UPDATE_REPORT = report;
    log('[stage6] update report', report);
    try {
      w.console?.table(report.topSources);
    } catch {
      /* noop */
    }
    return report;
  };

  w.__PURE_STAGE6_UPDATE_STACKS = (n = 5) => {
    const data = buildStacks(n);
    w.__PURE_STAGE6_LAST_UPDATE_STACKS = data;
    for (const s of data) {
      log(
        `[stage6] #${s.id} ${s.kind} updates=${s.updates} hookIndex=${s.hookIndex} fiber=${s.fiberPath}\n` +
          `initial=${s.initialValue} samples=${JSON.stringify(s.valueSamples)}\n` +
          `--- hook call site (render frame) ---\n${s.hookStack}\n` +
          `--- first setter caller ---\n${s.callerStack}`,
      );
    }
    return data;
  };

  w.__PURE_STAGE6_UPDATE_RESET = () => {
    stats.length = 0;
    nextId = 1;
    captured = 0;
    commitTimes = [];
    startedAt = now();
    stopped = false;
    log('[stage6] tracer reset');
  };

  log(
    `[stage6] update tracer v3 active (dispatcher=${dispatcherOk}, commits=${commitsOk}). ` +
      'Wait ~120 s idle, then call __PURE_STAGE6_UPDATE_REPORT() and __PURE_STAGE6_UPDATE_STACKS(5).',
  );
};
