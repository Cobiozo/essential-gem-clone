/**
 * Push Notification & Caching Service Worker
 * Handles push events, notification clicks, and multi-strategy caching
 */

// Cache Configuration
const CACHE_STATIC = 'purelife-static-v4';
const CACHE_ASSETS = 'purelife-assets-v2';
const CACHE_API = 'purelife-api-v2';
const CACHE_FONTS = 'purelife-fonts-v2';
const ALL_CACHES = [CACHE_STATIC, CACHE_ASSETS, CACHE_API, CACHE_FONTS];

const STATIC_ASSETS = [
  '/manifest.json',
  '/pwa-192.png',
  '/pwa-512.png',
  '/pwa-maskable-512.png',
  '/favicon.ico',
];

// API cache TTL: 24 hours
const API_CACHE_TTL = 24 * 60 * 60 * 1000;
// Font cache TTL: 30 days
const FONT_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

// Supabase cookie-related endpoints to cache
const COOKIE_API_PATTERNS = [
  'rest/v1/cookie_consent_settings',
  'rest/v1/cookie_banner_settings',
  'rest/v1/cookie_categories',
];

// ─── Install ───────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('[SW] Failed to cache static assets:', err);
      });
    })
  );
  // Removed self.skipWaiting() — controlled via 'SKIP_WAITING' message from app
  // Prevents SW from taking over page while user is on another tab
});

// ─── Activate ──────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated — cache version: static-v4');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!ALL_CACHES.includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch Handler ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // 1. Static assets (same-origin manifest, icons, favicon)
  if (url.origin === self.location.origin) {
    const isStatic = STATIC_ASSETS.some(p => url.pathname === p);
    if (isStatic) {
      event.respondWith(cacheFirst(event.request, CACHE_STATIC));
      return;
    }

    // 2. IMPORTANT: do NOT cache JS/CSS app chunks in SW.
    // They are already cached via HTTP headers (immutable hashes) and SW cache here
    // can cause chunk-mismatch/runtime errors after deployments.
    if (url.pathname.startsWith('/assets/') && /\.[a-f0-9]{8,}\.(js|css)$/.test(url.pathname)) {
      return;
    }
  }

  // 3. Supabase cookie API — stale-while-revalidate
  if (COOKIE_API_PATTERNS.some(p => url.pathname.includes(p))) {
    event.respondWith(staleWhileRevalidate(event.request, CACHE_API, API_CACHE_TTL));
    return;
  }

  // 4. Google Fonts — cache-first with TTL
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(event.request, CACHE_FONTS, FONT_CACHE_TTL));
    return;
  }

  // Everything else — network only (don't interfere)
});

// ─── Cache Strategies ──────────────────────────────────────────────────

/**
 * Cache-first: return cached if available, else fetch and cache.
 * Optional TTL — if cached response is older than maxAge, refetch.
 */
async function cacheFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // If no maxAge or within TTL, return cached
    if (!maxAge) return cached;
    const cachedDate = cached.headers.get('sw-cached-at');
    if (cachedDate && (Date.now() - parseInt(cachedDate, 10)) < maxAge) {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      // Add timestamp header for TTL checking
      const headers = new Headers(cloned.headers);
      headers.set('sw-cached-at', Date.now().toString());
      const body = await cloned.blob();
      const timestamped = new Response(body, { status: cloned.status, statusText: cloned.statusText, headers });
      cache.put(request, timestamped);
    }
    return response;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

/**
 * Stale-while-revalidate: return cached immediately, fetch fresh in background.
 * Respects TTL — if cache is older than maxAge, wait for network.
 */
async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchAndCache = async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cloned = response.clone();
        const headers = new Headers(cloned.headers);
        headers.set('sw-cached-at', Date.now().toString());
        const body = await cloned.blob();
        const timestamped = new Response(body, { status: cloned.status, statusText: cloned.statusText, headers });
        await cache.put(request, timestamped);
      }
      return response;
    } catch (err) {
      if (cached) return cached;
      throw err;
    }
  };

  if (cached) {
    const cachedDate = cached.headers.get('sw-cached-at');
    const isExpired = !cachedDate || (Date.now() - parseInt(cachedDate, 10)) > maxAge;

    if (isExpired) {
      // Expired — try network, fall back to stale cache
      try {
        return await fetchAndCache();
      } catch {
        return cached;
      }
    }

    // Fresh cache — return it, revalidate in background
    fetchAndCache();
    return cached;
  }

  // No cache — must fetch
  return fetchAndCache();
}

// ─── Push Notifications ────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'Pure Life Center',
    body: 'Masz nową wiadomość',
    url: '/messages',
    icon: '/pwa-192.png',
    badge: '/favicon.ico',
    tag: `notification-${Date.now()}`,
    requireInteraction: false,
    silent: false,
    vibrate: [100, 50, 100],
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      try { data.body = event.data.text(); } catch (e2) { /* ignore */ }
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192.png',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || `notification-${Date.now()}`,
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    timestamp: Date.now(),
    data: {
      url: data.url || '/messages',
      timestamp: Date.now(),
      ...data.data,
    },
    actions: [
      { action: 'open', title: 'Otwórz' },
      { action: 'dismiss', title: 'Zamknij' }
    ]
  };

  if (!data.silent && data.vibrate && Array.isArray(data.vibrate) && data.vibrate.length > 0) {
    options.vibrate = data.vibrate;
  }

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/messages';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          return client.navigate(fullUrl);
        }
      }
      return self.clients.openWindow(fullUrl);
    })
  );
});

self.addEventListener('notificationclose', () => {});

// ─── Messages from App ────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_NOTIFICATIONS') {
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach(n => n.close());
    });
  }
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Push Subscription Change ──────────────────────────────────────────

const SUPABASE_URL = 'https://xzlhssqqbajqhnsmbucf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDI2MDksImV4cCI6MjA3Mzg3ODYwOX0.8eHStZeSprUJ6YNQy45hEQe1cpudDxCFvk6sihWKLhA';

/**
 * Automatic subscription renewal when browser rotates the push endpoint.
 * Happens especially on Safari/iOS after updates or re-installs.
 * Calls renew-push-subscription edge function to update the DB without user action.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] pushsubscriptionchange — renewing subscription automatically');

  event.waitUntil(
    (async () => {
      try {
        const oldSubscription = event.oldSubscription;
        const applicationServerKey = oldSubscription?.options?.applicationServerKey;

        if (!applicationServerKey) {
          console.warn('[SW] pushsubscriptionchange — no applicationServerKey, cannot renew');
          // Notify app to handle re-subscription via UI
          const clients = await self.clients.matchAll({ type: 'window' });
          clients.forEach(client => client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED', canAutoRenew: false }));
          return;
        }

        // Re-subscribe with the same VAPID key
        const newSubscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        const subJSON = newSubscription.toJSON();
        console.log('[SW] pushsubscriptionchange — new subscription obtained, updating database');

        // Update DB via edge function (no JWT needed — uses service role on server)
        const response = await fetch(`${SUPABASE_URL}/functions/v1/renew-push-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            oldEndpoint: oldSubscription?.endpoint || '',
            newEndpoint: newSubscription.endpoint,
            p256dh: subJSON.keys?.p256dh || '',
            auth: subJSON.keys?.auth || '',
          }),
        });

        const result = await response.json();
        console.log('[SW] pushsubscriptionchange — DB updated:', result);

        // Notify open app windows about the renewal
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => client.postMessage({
          type: 'PUSH_SUBSCRIPTION_CHANGED',
          canAutoRenew: true,
          renewed: result.success,
        }));

      } catch (err) {
        console.error('[SW] pushsubscriptionchange — auto-renewal failed:', err);
        // Fallback: notify app to prompt user to re-subscribe
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED', canAutoRenew: false, error: err.message }));
      }
    })()
  );
});
