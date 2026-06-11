
## Problem

On every refresh / module entry, raw translation keys (`auth.signIn`, `nav.home`, `auth.adminPanel`…) flash for ~300–800 ms before the real Polish/EN/DE text appears. Reason: translations are fetched from Supabase **asynchronously** inside `LanguageProvider`'s `useEffect`, so the first render of every component runs with an empty cache and `t(key)` returns the raw key as fallback.

Today's flow (in `src/hooks/useTranslations.ts` + `src/contexts/LanguageContext.tsx`):

```text
mount → render with empty cache → t('auth.signIn') === 'auth.signIn'  ← FLASH
      → useEffect → fetch from Supabase / localStorage
      → setState → re-render with real strings
```

There **is** a localStorage cache (`i18n_translations_cache_<lang>`, 5 min TTL), but it's only read inside the async fetcher — never used to hydrate the very first render.

## Goal

Zero visible flash of raw keys on:
- Hard refresh (cold cache)
- Soft navigation between modules
- Language switch

## Plan

### 1. Synchronous hydration from localStorage (eliminates flash on warm cache)

In `src/hooks/useTranslations.ts`:
- Add `hydrateCacheFromLocalStorageSync(langCodes)` that runs at **module import time** (top-level, before React renders). It reads `i18n_translations_cache_pl` and `i18n_translations_cache_<saved-lang>` from localStorage and populates the in-memory `translationsCache` + `loadedLanguages` synchronously.
- Read the saved language from `localStorage.getItem('pure-life-language')` so we hydrate the right pair.
- Keep the existing 5-min TTL but, for hydration only, accept stale entries up to 7 days (revalidate-on-mount, stale-while-revalidate). This guarantees a populated cache on every return visit.

Result: on warm cache, `getTranslation` returns real strings on the very first render → no flash.

### 2. Hard gate for cold cache (first-ever visit)

In `src/contexts/LanguageContext.tsx`:
- Add `ready` flag to `LanguageContextType`. `ready = true` when either (a) sync hydration succeeded, or (b) the initial async fetch finished.
- Export `ready` from `useLanguage()`.
- In `src/main.tsx` (or top-level `App`), wrap the router in a tiny gate component: while `!ready && !hasHydrated`, render a minimal splash (existing logo + spinner already present in `AuthContext` loading state) instead of the route tree. This only triggers on the user's first-ever visit; on every subsequent visit step 1 covers it.

### 3. Background revalidation (keeps strings fresh)

After sync hydration we still kick off the existing async `loadTranslationsCache` in the background to refresh stale entries. When it resolves and the data differs, `notifyListeners()` already triggers re-render — no UX change, just newer copy.

### 4. Preload current language before app mount

In `src/main.tsx`, before `ReactDOM.createRoot().render(...)`:
- Call `hydrateCacheFromLocalStorageSync()` (sync, instant).
- Fire-and-forget `loadTranslationsCache(savedLang)` so by the time React commits, the promise is usually resolved.

### 5. Safe fallback for `t(key)` during the brief cold window

In `LanguageContext.t()`:
- If translation missing AND `ready === false`, return an **empty string** instead of the raw key. This prevents the `auth.signIn` text from ever being painted, even in the worst case (first visit, slow network, hydration miss). Combined with the gate in step 2 this is belt-and-suspenders.
- Keep returning the key (and dev warning) once `ready === true`, so genuine missing keys are still visible to developers.

### 6. Module-entry flashes (route changes within app)

These happen when a lazy-loaded route mounts before its namespace is in cache. Since we now hydrate **all** translations for `pl` + current language at module import time (single cache, not per-namespace), route changes hit a warm in-memory cache → no fetch, no flash.

## Files touched

- `src/hooks/useTranslations.ts` — add sync hydration, extend TTL for hydration path, expose `hydrateCacheFromLocalStorageSync()`.
- `src/contexts/LanguageContext.tsx` — add `ready` flag, hydrate on construction, empty-string fallback while `!ready`.
- `src/main.tsx` — call sync hydration + kick off async load before `render()`; wrap app in `<TranslationsGate>` (small inline component) that shows splash only on true cold start.
- (No DB changes, no edge-function changes, no UI redesign.)

## Out of scope

- Server-side rendering of translations (would require Next.js).
- Bundling Polish strings into the JS chunk (defeats the dynamic-CMS i18n model).
- Changing how admins edit translations.

## Validation

1. Clear `localStorage` → hard refresh `/auth` → expect splash (≤500 ms), then fully translated UI; **no** `auth.*` keys visible.
2. Refresh again → expect instant translated UI, no splash, no flash.
3. Switch language `pl → en` → existing brief load is fine (already gated by current spinner), no key flash.
4. Navigate `/auth → /dashboard → /admin` → no flashes on any module entry.
5. Open DevTools → Network → confirm only one `i18n_translations` fetch per language per 5 min.
