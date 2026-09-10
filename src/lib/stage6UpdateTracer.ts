/**
 * STAGE 6 DIAGNOSTIC — FIRST_DISPATCH -> React commit attribution.
 *
 * Installed only for ?stage6TraceUpdates=1. This is intentionally heuristic:
 * React 18 does not expose the update which caused a commit through the public
 * DevTools hook. We correlate bounded dispatch records with the next commit and
 * explicitly exclude ref/commit-phase callbacks from root-cause attribution.
 */

const VERSION = 5;
const AUTO_STOP_MS = 180_000;
const CORRELATION_WINDOW_MS = 2_000;
const BURST_GAP_MS = 250;
const CAPTURE_LIMIT = 6_000;
const STACK_SAMPLES = 3;
const MAX_PENDING = 12_000;
const MAX_COMMITS = 5_000;
const MAX_ASYNC_SOURCES = 1_500;

type HookKind = 'useState' | 'useReducer' | 'useSyncExternalStore';
type DispatchPhase =
  | 'BEFORE_RENDER'
  | 'DURING_RENDER'
  | 'COMMIT_PHASE'
  | 'LAYOUT_EFFECT'
  | 'PASSIVE_EFFECT'
  | 'EVENT_HANDLER'
  | 'TIMER_RAF'
  | 'OBSERVER'
  | 'EXTERNAL_STORE'
  | 'UNKNOWN';

type AsyncKind =
  | 'setTimeout'
  | 'setInterval'
  | 'requestAnimationFrame'
  | 'event'
  | 'ResizeObserver'
  | 'MutationObserver'
  | 'IntersectionObserver'
  | 'externalStore';

interface SourceLocation {
  frame: string;
  url: string;
  line: number;
  column: number;
}

interface AsyncSource {
  id: number;
  key: string;
  kind: AsyncKind;
  label: string;
  registrationStack: string | null;
  delayMs: number | null;
  callbacks: number;
  dispatches: number;
  firstCallbackAt: number;
  lastCallbackAt: number;
}

interface SourceStat {
  id: number;
  generation: number;
  kind: HookKind;
  owner: string;
  fiberPath: string | null;
  hookStack: string | null;
  hookIndex: number | null;
  initialValue: string | null;
  valueSamples: string[];
  callerStacks: string[];
  count: number;
  primaryCount: number;
  secondaryCount: number;
  firstRootCauseCommits: number;
  correlatedCommits: number;
  firstAt: number;
  lastAt: number;
  phases: Partial<Record<DispatchPhase, number>>;
  asyncSources: Map<number, number>;
  supabaseSignals: Set<string>;
  provider: string | null;
  subscribeName: string | null;
  wrapped?: unknown;
}

interface DispatchRecord {
  id: number;
  at: number;
  sourceId: number;
  phase: DispatchPhase;
  secondary: boolean;
  asyncSourceId: number | null;
  stackSample: string | null;
  consumed: boolean;
}

interface CommitRecord {
  id: number;
  rootId: number;
  at: number;
  duration: number | null;
  firstDispatch: DispatchRecord | null;
  dispatches: DispatchRecord[];
  deltaMs: number | null;
}

interface RuntimeContext {
  phase: DispatchPhase;
  asyncSource: AsyncSource | null;
}

let nextSourceId = 1;
let nextDispatchId = 1;
let nextAsyncId = 1;
let nextRootId = 1;
let generation = 0;
let captured = 0;
let startedAt = 0;
let stopped = false;
let reactInternals: any = null;
let currentContext: RuntimeContext | null = null;
let lastCommitAt = 0;

const stats: SourceStat[] = [];
const sourceById = new Map<number, SourceStat>();
const dispatchHolders = new WeakMap<object, SourceStat>();
const externalHolders = new WeakMap<object, { stat: SourceStat; wrapped: Function }>();
const pendingDispatches: DispatchRecord[] = [];
const commits: CommitRecord[] = [];
const rootIds = new WeakMap<object, number>();
const asyncSources = new Map<string, AsyncSource>();
const restores: Array<() => void> = [];

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
    .map(line => line.trim())
    .filter(line => line && !line.includes('stage6UpdateTracer'));

const stackText = () => cleanStack(rawStack()).join('\n');

const sourceLocations = (stack: string | null): SourceLocation[] => {
  if (!stack) return [];
  const locations: SourceLocation[] = [];
  for (const frame of stack.split('\n')) {
    const match = frame.match(/((?:https?:\/\/|\/)[^\s()]+):(\d+):(\d+)\)?$/);
    if (!match) continue;
    locations.push({ frame, url: match[1], line: Number(match[2]), column: Number(match[3]) });
  }
  return locations;
};

const preview = (value: unknown): string => {
  try {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'function') return `function ${(value as { name?: string }).name || '(anonymous)'}`;
    if (value instanceof Date) return `Date(${value.toISOString()})`;
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === 'object') {
      const ctor = (value as object).constructor?.name || 'Object';
      let json = '';
      try { json = JSON.stringify(value) || ''; } catch { json = ''; }
      return `${ctor} ${json.slice(0, 160)}`;
    }
    return `${typeof value}: ${String(value).slice(0, 160)}`;
  } catch {
    return '(unreadable)';
  }
};

const fiberPathFromOwner = (): string | null => {
  try {
    const owner = reactInternals?.ReactCurrentOwner?.current;
    if (!owner) return null;
    const names: string[] = [];
    let fiber = owner;
    for (let depth = 0; fiber && depth < 10; depth += 1, fiber = fiber.return) {
      const type = fiber.type ?? fiber.elementType;
      const name =
        (typeof type === 'string' && type) ||
        type?.displayName || type?.name || type?.render?.displayName || type?.render?.name;
      if (name) names.push(name);
    }
    return names.length ? names.join(' < ') : null;
  } catch {
    return null;
  }
};

let lastFrameKey = '';
let hookSequence = 0;
const nextHookIndex = (frames: string[]): number => {
  const key = frames[1] || frames[0] || '';
  if (key === lastFrameKey) hookSequence += 1;
  else {
    lastFrameKey = key;
    hookSequence = 0;
  }
  return hookSequence;
};

const providerFrom = (text: string): string | null => {
  const known = ['AuthProvider', 'LanguageProvider', 'ThemeProvider', 'EditingProvider', 'ChatSidebarProvider', 'SidebarProvider', 'SessionTimerProvider', 'QueryClientProvider'];
  return known.find(name => text.includes(name)) || null;
};

const createStat = (kind: HookKind, initial: unknown, subscribeName: string | null = null): SourceStat => {
  const shouldCapture = captured < CAPTURE_LIMIT;
  const frames = shouldCapture ? cleanStack(rawStack()) : [];
  if (shouldCapture) captured += 1;
  const hookStack = shouldCapture ? frames.join('\n') : null;
  const fiberPath = shouldCapture ? fiberPathFromOwner() : null;
  const owner = frames.slice(0, 3).join(' <- ') || `${kind}@uncaptured`;
  const stat: SourceStat = {
    id: nextSourceId++, generation, kind, owner, fiberPath, hookStack,
    hookIndex: shouldCapture ? nextHookIndex(frames) : null,
    initialValue: shouldCapture ? preview(initial) : null,
    valueSamples: [], callerStacks: [], count: 0, primaryCount: 0,
    secondaryCount: 0, firstRootCauseCommits: 0, correlatedCommits: 0,
    firstAt: 0, lastAt: 0, phases: {}, asyncSources: new Map(),
    supabaseSignals: new Set(), provider: providerFrom(`${owner}\n${fiberPath || ''}`),
    subscribeName,
  };
  stats.push(stat);
  sourceById.set(stat.id, stat);
  return stat;
};

const SECONDARY_RE = /safelyAttachRef|commitAttachRef|commitLayoutEffectOnFiber|composeRefs|setTrigger|setValueNode|SlotClone|@radix-ui\/react-(?:slot|compose-refs)/i;
const SUPABASE_PATTERNS: Array<[RegExp, string]> = [
  [/supabase|postgrest|realtime/i, 'Supabase/realtime'],
  [/\.rpc\(|functions\.invoke|edge.?function/i, 'RPC/Edge Function'],
  [/invalidateQueries|queryClient/i, 'React Query invalidation'],
  [/(?:^|\W)fetch(?:\W|$)/i, 'fetch'],
];

const detectSupabaseSignals = (text: string): string[] =>
  SUPABASE_PATTERNS.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);

const phaseFor = (stack: string, kind: HookKind): { phase: DispatchPhase; secondary: boolean } => {
  if (SECONDARY_RE.test(stack)) return { phase: 'COMMIT_PHASE', secondary: true };
  if (currentContext) return { phase: currentContext.phase, secondary: false };
  try {
    if (reactInternals?.ReactCurrentOwner?.current) return { phase: 'DURING_RENDER', secondary: false };
  } catch { /* best effort */ }
  if (/commitHookEffectListMount|commitPassiveMount|flushPassiveEffects/i.test(stack)) return { phase: 'PASSIVE_EFFECT', secondary: false };
  if (/commitLayoutEffect|commitHookLayoutEffects/i.test(stack)) return { phase: 'LAYOUT_EFFECT', secondary: false };
  if (/dispatchEvent|executeDispatch|processDispatchQueue/i.test(stack)) return { phase: 'EVENT_HANDLER', secondary: false };
  if (/setTimeout|setInterval|requestAnimationFrame/i.test(stack)) return { phase: 'TIMER_RAF', secondary: false };
  if (/ResizeObserver|MutationObserver|IntersectionObserver/i.test(stack)) return { phase: 'OBSERVER', secondary: false };
  if (kind === 'useSyncExternalStore') return { phase: 'EXTERNAL_STORE', secondary: false };
  return { phase: 'BEFORE_RENDER', secondary: false };
};

const enrollAfterReset = (stat: SourceStat) => {
  if (stat.generation === generation) return;
  stat.generation = generation;
  stat.valueSamples = [];
  stat.callerStacks = [];
  stat.count = 0;
  stat.primaryCount = 0;
  stat.secondaryCount = 0;
  stat.firstRootCauseCommits = 0;
  stat.correlatedCommits = 0;
  stat.firstAt = 0;
  stat.lastAt = 0;
  stat.phases = {};
  stat.asyncSources = new Map();
  stat.supabaseSignals = new Set();
  stats.push(stat);
};

const record = (stat: SourceStat, args: unknown[], forceStack?: string) => {
  if (stopped) return;
  const timestamp = now();
  if (timestamp - startedAt > AUTO_STOP_MS) {
    stopped = true;
    return;
  }
  enrollAfterReset(stat);
  const callerStack = forceStack || stackText();
  const classification = phaseFor(callerStack, stat.kind);
  const asyncSource = currentContext?.asyncSource || null;

  if (stat.count === 0) stat.firstAt = timestamp;
  stat.count += 1;
  stat.lastAt = timestamp;
  stat.phases[classification.phase] = (stat.phases[classification.phase] || 0) + 1;
  if (classification.secondary) stat.secondaryCount += 1;
  else stat.primaryCount += 1;
  if (args.length && stat.valueSamples.length < STACK_SAMPLES) stat.valueSamples.push(preview(args[0]));
  if (stat.callerStacks.length < STACK_SAMPLES && !stat.callerStacks.includes(callerStack)) stat.callerStacks.push(callerStack);
  if (asyncSource) {
    asyncSource.dispatches += 1;
    stat.asyncSources.set(asyncSource.id, (stat.asyncSources.get(asyncSource.id) || 0) + 1);
  }
  for (const signal of detectSupabaseSignals(`${callerStack}\n${asyncSource?.registrationStack || ''}`)) stat.supabaseSignals.add(signal);

  const dispatch: DispatchRecord = {
    id: nextDispatchId++, at: timestamp, sourceId: stat.id,
    phase: classification.phase, secondary: classification.secondary,
    asyncSourceId: asyncSource?.id || null,
    stackSample: stat.callerStacks.length <= STACK_SAMPLES ? callerStack : null,
    consumed: false,
  };
  pendingDispatches.push(dispatch);
  if (pendingDispatches.length > MAX_PENDING) pendingDispatches.splice(0, pendingDispatches.length - MAX_PENDING);
};

const wrapDispatchLike = (kind: HookKind, original: Function, initial: unknown) => {
  const existing = dispatchHolders.get(original);
  if (existing?.wrapped) return existing.wrapped;
  const stat = existing || createStat(kind, initial);
  const wrapped = (...args: unknown[]) => {
    record(stat, args);
    return original(...args);
  };
  Object.defineProperty(wrapped, '__stage6', { value: true });
  stat.wrapped = wrapped;
  dispatchHolders.set(original, stat);
  return wrapped;
};

const withContext = <T>(context: RuntimeContext, callback: () => T): T => {
  const prior = currentContext;
  currentContext = context;
  try { return callback(); }
  finally { currentContext = prior; }
};

const wrapEffect = (effect: unknown, phase: 'LAYOUT_EFFECT' | 'PASSIVE_EFFECT') => {
  if (typeof effect !== 'function') return effect;
  return function (this: unknown, ...args: unknown[]) {
    const cleanup = withContext({ phase, asyncSource: null }, () => effect.apply(this, args));
    if (typeof cleanup !== 'function') return cleanup;
    return (...cleanupArgs: unknown[]) =>
      withContext({ phase, asyncSource: null }, () => cleanup(...cleanupArgs));
  };
};

const wrapDispatcher = (dispatcher: any) => {
  if (dispatcher.__stage6Wrapped) return dispatcher;
  const originalUseState = dispatcher.useState;
  const originalUseReducer = dispatcher.useReducer;
  const originalUseSyncExternalStore = dispatcher.useSyncExternalStore;
  const originalUseEffect = dispatcher.useEffect;
  const originalUseLayoutEffect = dispatcher.useLayoutEffect;
  const originalUseInsertionEffect = dispatcher.useInsertionEffect;

  if (typeof originalUseState === 'function') {
    dispatcher.useState = function (this: unknown, ...args: unknown[]) {
      const result = originalUseState.apply(this, args);
      const setter = result[1];
      return typeof setter === 'function' && !setter.__stage6
        ? [result[0], wrapDispatchLike('useState', setter, result[0])]
        : result;
    };
  }
  if (typeof originalUseReducer === 'function') {
    dispatcher.useReducer = function (this: unknown, ...args: unknown[]) {
      const result = originalUseReducer.apply(this, args);
      const dispatch = result[1];
      return typeof dispatch === 'function' && !dispatch.__stage6
        ? [result[0], wrapDispatchLike('useReducer', dispatch, result[0])]
        : result;
    };
  }
  if (typeof originalUseSyncExternalStore === 'function') {
    dispatcher.useSyncExternalStore = function (this: unknown, subscribe: Function, ...rest: unknown[]) {
      let holder = externalHolders.get(subscribe);
      if (!holder) {
        const stat = createStat('useSyncExternalStore', undefined, subscribe.name || '(anonymous subscribe)');
        const registrationStack = stat.hookStack;
        const asyncSource = getAsyncSource('externalStore', subscribe.name || 'anonymous subscribe', null, registrationStack);
        const wrapped = (notify: () => void) => subscribe(() => {
          asyncSource.callbacks += 1;
          if (!asyncSource.firstCallbackAt) asyncSource.firstCallbackAt = now();
          asyncSource.lastCallbackAt = now();
          withContext({ phase: 'EXTERNAL_STORE', asyncSource }, () => {
            record(stat, [], registrationStack || undefined);
            notify();
          });
        });
        holder = { stat, wrapped };
        externalHolders.set(subscribe, holder);
      }
      return originalUseSyncExternalStore.call(this, holder.wrapped, ...rest);
    };
  }
  if (typeof originalUseEffect === 'function') {
    dispatcher.useEffect = function (this: unknown, effect: unknown, ...args: unknown[]) {
      return originalUseEffect.call(this, wrapEffect(effect, 'PASSIVE_EFFECT'), ...args);
    };
  }
  if (typeof originalUseLayoutEffect === 'function') {
    dispatcher.useLayoutEffect = function (this: unknown, effect: unknown, ...args: unknown[]) {
      return originalUseLayoutEffect.call(this, wrapEffect(effect, 'LAYOUT_EFFECT'), ...args);
    };
  }
  if (typeof originalUseInsertionEffect === 'function') {
    dispatcher.useInsertionEffect = function (this: unknown, effect: unknown, ...args: unknown[]) {
      return originalUseInsertionEffect.call(this, wrapEffect(effect, 'LAYOUT_EFFECT'), ...args);
    };
  }
  dispatcher.__stage6Wrapped = true;
  return dispatcher;
};

const installDispatcherHook = (React: any): boolean => {
  const internals = React?.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
    React?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  reactInternals = internals || null;
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
          if (cached) { value = cached; return; }
          try {
            const clone = Object.assign(Object.create(Object.getPrototypeOf(next)), next);
            wrapDispatcher(clone);
            cache.set(next, clone);
            cache.set(clone, clone);
            value = clone;
            return;
          } catch { /* retain original dispatcher */ }
        }
        value = next;
      },
    });
  } catch {
    return false;
  }
  return true;
};

const asyncKey = (kind: AsyncKind, label: string, delayMs: number | null, registrationStack: string | null) =>
  `${kind}|${label}|${delayMs ?? ''}|${cleanStack(registrationStack || '').slice(0, 4).join('|')}`;

function getAsyncSource(kind: AsyncKind, label: string, delayMs: number | null, registrationStack: string | null): AsyncSource {
  const key = asyncKey(kind, label, delayMs, registrationStack);
  const existing = asyncSources.get(key);
  if (existing) return existing;
  const source: AsyncSource = {
    id: nextAsyncId++, key, kind, label, registrationStack, delayMs,
    callbacks: 0, dispatches: 0, firstCallbackAt: 0, lastCallbackAt: 0,
  };
  if (asyncSources.size < MAX_ASYNC_SOURCES) asyncSources.set(key, source);
  return source;
}

const runAsyncCallback = <T>(source: AsyncSource, callback: () => T): T => {
  if (stopped) return callback();
  source.callbacks += 1;
  const timestamp = now();
  if (!source.firstCallbackAt) source.firstCallbackAt = timestamp;
  source.lastCallbackAt = timestamp;
  const phase: DispatchPhase = source.kind === 'event' ? 'EVENT_HANDLER' :
    source.kind.endsWith('Observer') ? 'OBSERVER' : 'TIMER_RAF';
  return withContext({ phase, asyncSource: source }, callback);
};

const installAsyncInstrumentation = (): boolean => {
  const w = window as any;
  if (restores.length) return true;
  try {
    const originalSetTimeout = w.setTimeout;
    const originalSetInterval = w.setInterval;
    const originalRaf = typeof w.requestAnimationFrame === 'function' ? w.requestAnimationFrame : null;
    w.setTimeout = (callback: TimerHandler, delay?: number, ...args: unknown[]) => {
      if (typeof callback !== 'function') return originalSetTimeout.call(w, callback, delay, ...args);
      const source = getAsyncSource('setTimeout', callback.name || '(anonymous)', Number(delay) || 0, stackText());
      return originalSetTimeout.call(w, () => runAsyncCallback(source, () => callback(...args)), delay);
    };
    w.setInterval = (callback: TimerHandler, delay?: number, ...args: unknown[]) => {
      if (typeof callback !== 'function') return originalSetInterval.call(w, callback, delay, ...args);
      const source = getAsyncSource('setInterval', callback.name || '(anonymous)', Number(delay) || 0, stackText());
      return originalSetInterval.call(w, () => runAsyncCallback(source, () => callback(...args)), delay);
    };
    if (originalRaf) {
      w.requestAnimationFrame = (callback: FrameRequestCallback) => {
        const source = getAsyncSource('requestAnimationFrame', callback.name || '(anonymous)', null, stackText());
        return originalRaf.call(w, (timestamp: number) => runAsyncCallback(source, () => callback(timestamp)));
      };
    }
    restores.push(() => {
      w.setTimeout = originalSetTimeout;
      w.setInterval = originalSetInterval;
      if (originalRaf) w.requestAnimationFrame = originalRaf;
    });
  } catch { return false; }

  const observerNames: Array<'ResizeObserver' | 'MutationObserver' | 'IntersectionObserver'> =
    ['ResizeObserver', 'MutationObserver', 'IntersectionObserver'];
  for (const name of observerNames) {
    const Original = (window as any)[name];
    if (typeof Original !== 'function') continue;
    try {
      const Wrapped = class extends Original {
        constructor(callback: Function) {
          const source = getAsyncSource(name, callback.name || '(anonymous)', null, stackText());
          super((...args: unknown[]) => runAsyncCallback(source, () => callback(...args)));
        }
      };
      (window as any)[name] = Wrapped;
      restores.push(() => { (window as any)[name] = Original; });
    } catch { /* optional instrumentation */ }
  }

  try {
    const originalAdd = EventTarget.prototype.addEventListener;
    const originalRemove = EventTarget.prototype.removeEventListener;
    const targetMaps = new WeakMap<EventTarget, WeakMap<object, Map<string, EventListenerOrEventListenerObject>>>();
    const captureKey = (type: string, options?: boolean | AddEventListenerOptions) =>
      `${type}|${typeof options === 'boolean' ? options : Boolean(options?.capture)}`;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (!listener) return originalAdd.call(this, type, listener, options);
      const objectKey = listener as object;
      let listenerMap = targetMaps.get(this);
      if (!listenerMap) { listenerMap = new WeakMap(); targetMaps.set(this, listenerMap); }
      let wrappers = listenerMap.get(objectKey);
      if (!wrappers) { wrappers = new Map(); listenerMap.set(objectKey, wrappers); }
      const key = captureKey(type, options);
      let wrapped = wrappers.get(key);
      if (!wrapped) {
        const source = getAsyncSource('event', type, null, stackText());
        wrapped = function (this: EventTarget, event: Event) {
          return runAsyncCallback(source, () => typeof listener === 'function'
            ? listener.call(this, event)
            : listener.handleEvent(event));
        };
        wrappers.set(key, wrapped);
      }
      return originalAdd.call(this, type, wrapped, options);
    };
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      if (!listener) return originalRemove.call(this, type, listener, options);
      const wrapped = targetMaps.get(this)?.get(listener as object)?.get(captureKey(type, options));
      return originalRemove.call(this, type, wrapped || listener, options);
    };
    restores.push(() => {
      EventTarget.prototype.addEventListener = originalAdd;
      EventTarget.prototype.removeEventListener = originalRemove;
    });
  } catch { /* optional instrumentation */ }
  return true;
};

const disableAsyncInstrumentation = () => {
  while (restores.length) {
    try { restores.pop()?.(); } catch { /* noop */ }
  }
};

const rootIdFor = (root: object): number => {
  const existing = rootIds.get(root);
  if (existing) return existing;
  const id = nextRootId++;
  rootIds.set(root, id);
  return id;
};

const installCommitCounter = (): boolean => {
  const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!hook) return false;
  const original = hook.onCommitFiberRoot;
  hook.onCommitFiberRoot = function (this: unknown, ...args: unknown[]) {
    if (!stopped && commits.length < MAX_COMMITS) {
      const timestamp = now();
      const lowerBound = Math.max(lastCommitAt, timestamp - CORRELATION_WINDOW_MS);
      const eligible = pendingDispatches.filter(dispatch =>
        !dispatch.consumed && !dispatch.secondary && dispatch.at > lowerBound && dispatch.at <= timestamp,
      );
      const firstDispatch = eligible[0] || null;
      const uniqueSources = new Set<number>();
      for (const dispatch of eligible) {
        dispatch.consumed = true;
        uniqueSources.add(dispatch.sourceId);
      }
      for (const sourceId of uniqueSources) {
        const stat = sourceById.get(sourceId);
        if (stat) stat.correlatedCommits += 1;
      }
      if (firstDispatch) {
        const stat = sourceById.get(firstDispatch.sourceId);
        if (stat) stat.firstRootCauseCommits += 1;
      }
      const root = args[1] as { current?: { actualDuration?: unknown } } | undefined;
      const measuredDuration = root?.current?.actualDuration;
      const duration = typeof measuredDuration === 'number' ? measuredDuration : null;
      commits.push({
        id: commits.length + 1,
        rootId: root && typeof root === 'object' ? rootIdFor(root) : 0,
        at: timestamp,
        duration,
        firstDispatch,
        dispatches: eligible,
        deltaMs: firstDispatch ? timestamp - firstDispatch.at : null,
      });
      lastCommitAt = timestamp;
      if (pendingDispatches.length > MAX_PENDING / 2) {
        const keepAfter = timestamp - CORRELATION_WINDOW_MS;
        for (let index = pendingDispatches.length - 1; index >= 0; index -= 1) {
          if (pendingDispatches[index].consumed || pendingDispatches[index].at < keepAfter) pendingDispatches.splice(index, 1);
        }
      }
    }
    if (typeof original === 'function') return original.apply(this, args);
  };
  return true;
};

const elapsedMinutes = () => Math.max(0.001, Math.min(now() - startedAt, AUTO_STOP_MS) / 60_000);
const activeStats = () => stats.filter(stat => stat.generation === generation && stat.count > 0);
const asyncById = (id: number | null) => id === null ? null : [...asyncSources.values()].find(source => source.id === id) || null;
const sourceSummary = (stat: SourceStat, minutes: number) => {
  const leadingAsync = [...stat.asyncSources.entries()].sort((a, b) => b[1] - a[1])[0];
  const asyncSource = leadingAsync ? asyncById(leadingAsync[0]) : null;
  return {
    source: `stage6-source-${stat.id}`,
    component: stat.fiberPath?.split(' < ')[0] || stat.owner,
    file: sourceLocations(stat.hookStack)[0] || null,
    hook: stat.kind,
    hookIndex: stat.hookIndex,
    updates: stat.primaryCount,
    updatesPerMinute: Math.round((stat.primaryCount / minutes) * 10) / 10,
    commitsCorrelated: stat.correlatedCommits,
    commitsAsFirstDispatch: stat.firstRootCauseCommits,
    idle: true,
    phases: stat.phases,
    provider: stat.provider,
    asyncSource: asyncSource ? {
      kind: asyncSource.kind, label: asyncSource.label, delayMs: asyncSource.delayMs,
      registration: sourceLocations(asyncSource.registrationStack)[0] || null,
    } : null,
    supabaseCorrelation: [...stat.supabaseSignals],
  };
};

const buildBursts = () => {
  const bursts: CommitRecord[][] = [];
  let current: CommitRecord[] = [];
  for (const commit of commits) {
    const previous = current[current.length - 1];
    if (!previous || commit.at - previous.at < BURST_GAP_MS) current.push(commit);
    else { bursts.push(current); current = [commit]; }
  }
  if (current.length) bursts.push(current);
  return bursts.map((burst, index) => {
    const first = burst.find(commit => commit.firstDispatch)?.firstDispatch || null;
    const last = [...burst].reverse().find(commit => commit.firstDispatch)?.firstDispatch || null;
    const firstStat = first ? sourceById.get(first.sourceId) : null;
    return {
      burst: index + 1,
      startedAtMs: Math.round(burst[0].at - startedAt),
      durationMs: Math.round(burst[burst.length - 1].at - burst[0].at),
      commits: burst.length,
      firstDispatchId: first?.id || null,
      lastDispatchId: last?.id || null,
      component: firstStat?.fiberPath?.split(' < ')[0] || firstStat?.owner || null,
      hook: firstStat?.kind || null,
      callerStack: first?.stackSample || null,
    };
  });
};

const buildRootCause = (sources: SourceStat[], correlated: number) => {
  const ranked = [...sources].sort((a, b) => b.firstRootCauseCommits - a.firstRootCauseCommits);
  const leader = ranked[0];
  if (leader && correlated >= 20 && leader.firstRootCauseCommits / correlated >= 0.6) {
    const component = leader.fiberPath?.split(' < ')[0] || leader.owner;
    return `ROOT CAUSE = ${component} / ${leader.kind} (heuristic confidence HIGH, ${leader.firstRootCauseCommits}/${correlated} correlated commits).`;
  }
  return 'Nie znaleziono root cause; potrzebny jest instrumentation poziomu React scheduler.';
};

const buildReport = () => {
  const minutes = elapsedMinutes();
  const sources = activeStats();
  const primarySources = sources.filter(source => source.primaryCount > 0)
    .sort((a, b) => b.firstRootCauseCommits - a.firstRootCauseCommits || b.primaryCount - a.primaryCount);
  const correlated = commits.filter(commit => commit.firstDispatch).length;
  const bursts = buildBursts();
  const asyncReport = [...asyncSources.values()]
    .filter(source => source.dispatches > 0)
    .sort((a, b) => b.dispatches - a.dispatches)
    .slice(0, 25)
    .map(source => ({
      kind: source.kind, callback: source.label, configuredDelayMs: source.delayMs,
      callbacks: source.callbacks, dispatches: source.dispatches,
      callbacksPerMinute: Math.round((source.callbacks / minutes) * 10) / 10,
      dispatchesPerMinute: Math.round((source.dispatches / minutes) * 10) / 10,
      registrationLocation: sourceLocations(source.registrationStack)[0] || null,
      registrationStack: source.registrationStack,
    }));
  return {
    approximate: true,
    version: VERSION,
    elapsedSeconds: Math.round(minutes * 60),
    A_commits: {
      total: commits.length,
      commitsPerMinute: Math.round((commits.length / minutes) * 10) / 10,
      roots: new Set(commits.map(commit => commit.rootId)).size,
      correlated,
      uncorrelated: commits.length - correlated,
      correlationCoveragePct: commits.length ? Math.round((correlated / commits.length) * 1000) / 10 : 0,
      durationNote: 'actualDuration is included only when the renderer exposes it; it is not used for attribution.',
    },
    B_firstDispatchTop10: primarySources.slice(0, 10).map(source => sourceSummary(source, minutes)),
    C_bursts: {
      thresholdMs: BURST_GAP_MS,
      count: bursts.length,
      burstsPerMinute: Math.round((bursts.length / minutes) * 10) / 10,
      multiCommitBursts: bursts.filter(burst => burst.commits > 1).length,
      maxCommitsInBurst: Math.max(0, ...bursts.map(burst => burst.commits)),
      top: [...bursts].sort((a, b) => b.commits - a.commits).slice(0, 20),
    },
    D_useSyncExternalStore: primarySources.filter(source => source.kind === 'useSyncExternalStore').map(source => ({
      ...sourceSummary(source, minutes), subscribeFunction: source.subscribeName,
    })),
    E_contextProviders: primarySources.filter(source => source.provider).map(source => sourceSummary(source, minutes)),
    F_timersRafObservers: asyncReport,
    G_supabaseCorrelation: {
      directCallerChainOnly: true,
      note: 'Async boundaries can remove the initiating request from a JavaScript stack; absence here is not proof of absence.',
      sources: primarySources.filter(source => source.supabaseSignals.size > 0).map(source => sourceSummary(source, minutes)),
    },
    H_rootCause: buildRootCause(primarySources, correlated),
    secondaryCommitUpdates: sources.filter(source => source.secondaryCount > 0)
      .sort((a, b) => b.secondaryCount - a.secondaryCount)
      .slice(0, 25)
      .map(source => ({
        source: `stage6-source-${source.id}`, component: source.fiberPath?.split(' < ')[0] || source.owner,
        hook: source.kind, count: source.secondaryCount, classification: 'SECONDARY_COMMIT_UPDATE',
      })),
    commitSamples: commits.slice(-50).map(commit => {
      const stat = commit.firstDispatch ? sourceById.get(commit.firstDispatch.sourceId) : null;
      return {
        commit: commit.id, rootId: commit.rootId, atMs: Math.round(commit.at - startedAt),
        firstDispatchId: commit.firstDispatch?.id || null,
        deltaDispatchToCommitMs: commit.deltaMs === null ? null : Math.round(commit.deltaMs * 100) / 100,
        component: stat?.fiberPath?.split(' < ')[0] || stat?.owner || null,
        hook: stat?.kind || null, phase: commit.firstDispatch?.phase || null,
        callerStack: commit.firstDispatch?.stackSample || null,
      };
    }),
    limitations: [
      'Correlation is temporal and approximate; React batching, transitions and concurrent rendering prevent a guaranteed 1:1 relation.',
      'Ref/commit-phase setters are excluded from FIRST_DISPATCH and reported as SECONDARY_COMMIT_UPDATE.',
      'Provider and source names are best-effort in a minified production build without a public sourcemap.',
      'Public React APIs do not expose the exact scheduler update or effect phase for every production dispatch.',
    ],
  };
};

const buildStacks = (requested: number) => {
  const minutes = elapsedMinutes();
  return activeStats()
    .sort((a, b) => b.firstRootCauseCommits - a.firstRootCauseCommits || b.primaryCount - a.primaryCount)
    .slice(0, requested)
    .map(stat => ({
      ...sourceSummary(stat, minutes),
      setterIdentity: `stage6-setter-${stat.id}`,
      initialValue: stat.initialValue,
      valueSamples: stat.valueSamples,
      fiberPath: stat.fiberPath,
      hookSourceLocations: sourceLocations(stat.hookStack),
      callerSourceLocations: stat.callerStacks.map(stack => sourceLocations(stack)),
      hookStack: stat.hookStack,
      callerStacks: stat.callerStacks,
    }));
};

export const installStage6UpdateTracer = (React: unknown) => {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (w.__PURE_STAGE6_UPDATE_TRACER_VERSION === VERSION) return;
  startedAt = now();
  let dispatcherOk = false;
  let commitsOk = false;
  let asyncOk = false;
  const log = (...args: unknown[]) => { try { w.console?.log(...args); } catch { /* noop */ } };

  const reportApi = () => {
    stopped = true;
    disableAsyncInstrumentation();
    const report = { dispatcherHook: dispatcherOk, commitHook: commitsOk, asyncInstrumentation: asyncOk, ...buildReport() };
    w.__PURE_STAGE6_LAST_UPDATE_REPORT = report;
    log('[stage6] FIRST_DISPATCH report', report);
    try { w.console?.table(report.B_firstDispatchTop10); } catch { /* noop */ }
    return report;
  };
  const stacksApi = (requested = 10) => {
    const parsed = Number(requested);
    const limit = Number.isFinite(parsed) ? Math.max(1, Math.min(25, Math.floor(parsed))) : 10;
    const result = buildStacks(limit);
    w.__PURE_STAGE6_LAST_UPDATE_STACKS = result;
    result.forEach(entry => log(`[stage6] ${entry.setterIdentity}`, entry));
    return result;
  };
  const resetApi = () => {
    stats.length = 0;
    generation += 1;
    captured = 0;
    pendingDispatches.length = 0;
    commits.length = 0;
    for (const source of asyncSources.values()) {
      source.callbacks = 0;
      source.dispatches = 0;
      source.firstCallbackAt = 0;
      source.lastCallbackAt = 0;
    }
    startedAt = now();
    lastCommitAt = 0;
    stopped = false;
    asyncOk = installAsyncInstrumentation();
    log('[stage6] FIRST_DISPATCH tracer reset');
    return true;
  };

  Object.assign(w, {
    __PURE_STAGE6_UPDATE_TRACER_VERSION: VERSION,
    __PURE_STAGE6_UPDATE_TRACER_ACTIVE: false,
    __PURE_STAGE6_UPDATE_REPORT: reportApi,
    __PURE_STAGE6_UPDATE_STACKS: stacksApi,
    __PURE_STAGE6_UPDATE_RESET: resetApi,
  });
  try { dispatcherOk = installDispatcherHook(React); }
  catch (error) { w.__PURE_STAGE6_UPDATE_TRACER_ERROR = `dispatcher: ${String(error)}`; }
  try { commitsOk = installCommitCounter(); }
  catch (error) { w.__PURE_STAGE6_UPDATE_TRACER_ERROR = `${w.__PURE_STAGE6_UPDATE_TRACER_ERROR || ''}; commit: ${String(error)}`; }
  try { asyncOk = installAsyncInstrumentation(); }
  catch (error) { w.__PURE_STAGE6_UPDATE_TRACER_ERROR = `${w.__PURE_STAGE6_UPDATE_TRACER_ERROR || ''}; async: ${String(error)}`; }

  w.__PURE_STAGE6_UPDATE_STATUS = {
    version: VERSION, installedAt: new Date().toISOString(),
    dispatcherHook: dispatcherOk, commitHook: commitsOk, asyncInstrumentation: asyncOk,
    correlationWindowMs: CORRELATION_WINDOW_MS, burstGapMs: BURST_GAP_MS,
  };
  w.__PURE_STAGE6_UPDATE_TRACER_ACTIVE = dispatcherOk && commitsOk;
  log('[stage6] FIRST_DISPATCH tracer v5 active. RESET, wait 120–180 s idle, then REPORT and STACKS(10).');
};