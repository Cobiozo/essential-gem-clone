/**
 * Push Notification Service Worker
 * Handles push events, notification clicks, and notification clearing
 */

// PWA Cache Configuration
const CACHE_NAME = 'purelife-pwa-v1';
const STATIC_ASSETS = [
  '/manifest.json',
  '/pwa-192.png',
  '/pwa-512.png',
];

// Log Service Worker lifecycle
self.addEventListener('install', (event) => {
  console.log('[SW-Push] Service Worker installed');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW-Push] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('[SW-Push] Failed to cache static assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW-Push] Service Worker activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW-Push] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW-Push] Push notification received');
  
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
  
  // Parse push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[SW-Push] Error parsing push data:', e);
      // Try as text
      try {
        data.body = event.data.text();
      } catch (e2) {
        console.error('[SW-Push] Error getting push text:', e2);
      }
    }
  }

  // Build notification options
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

  // Add vibration pattern if not silent and vibrate is provided
  if (!data.silent && data.vibrate && Array.isArray(data.vibrate) && data.vibrate.length > 0) {
    options.vibrate = data.vibrate;
  }

  console.log('[SW-Push] Showing notification:', data.title, 'silent:', data.silent, 'vibrate:', options.vibrate);
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW-Push] Notification clicked:', event.action);
  
  event.notification.close();
  
  // If user clicked dismiss, do nothing
  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/messages';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((windowClients) => {
      // Check if app is already open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          console.log('[SW-Push] Found existing window, focusing and navigating');
          client.focus();
          return client.navigate(fullUrl);
        }
      }
      // Open new window
      console.log('[SW-Push] Opening new window:', fullUrl);
      return self.clients.openWindow(fullUrl);
    })
  );
});

// Handle notification close (user dismissed without clicking)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW-Push] Notification closed by user');
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[SW-Push] Message received:', event.data);
  
  if (event.data === 'CLEAR_NOTIFICATIONS') {
    // Clear all notifications (useful when user opens messages page)
    self.registration.getNotifications().then((notifications) => {
      console.log('[SW-Push] Clearing', notifications.length, 'notification(s)');
      notifications.forEach(notification => notification.close());
    });
  }
  
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch handler - cache-first for static assets, network-first for everything else
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  
  // Cache-first for manifest, icons, and static assets
  const cacheablePatterns = ['/manifest.json', '/pwa-192.png', '/pwa-512.png', '/pwa-maskable-512.png', '/favicon.ico'];
  const isCacheable = cacheablePatterns.some(p => url.pathname === p);
  
  if (isCacheable) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Network-first for everything else (don't interfere with app routing)
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW-Push] Push subscription changed');
  // The main app should handle resubscription
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
      });
    })
  );
});
