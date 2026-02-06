

# Plan: Pełny system Push Notifications z Service Worker

## Przegląd architektury

System push notifications będzie działać na trzech platformach:
- **Android Chrome/Edge** - pełne wsparcie natywne
- **Windows Chrome/Edge/Firefox** - pełne wsparcie natywne  
- **iOS Safari** - wymaga PWA (dodanie do ekranu głównego), dostępne od iOS 16.4+

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ARCHITEKTURA PUSH NOTIFICATIONS                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────────────────┐ │
│  │   Klient     │    │  Supabase Edge   │    │   Push Service (FCM/APNs) │ │
│  │  (React App) │    │    Functions     │    │                           │ │
│  └──────┬───────┘    └────────┬─────────┘    └─────────────┬─────────────┘ │
│         │                     │                            │               │
│         │ 1. Rejestracja      │                            │               │
│         │    subskrypcji      │                            │               │
│         │ ─────────────────►  │                            │               │
│         │                     │  2. Zapisz do              │               │
│         │                     │     user_push_subscriptions│               │
│         │                     │  ◄────────────────►        │               │
│         │                     │                            │               │
│         │                     │  3. Nowa wiadomość         │               │
│         │                     │     (trigger)              │               │
│         │                     │  ─────────────────────────►│               │
│         │                     │                            │               │
│         │  4. Push event      │                            │               │
│         │ ◄────────────────────────────────────────────────│               │
│         │                     │                            │               │
│  ┌──────▼───────┐                                                          │
│  │Service Worker│ 5. showNotification()                                    │
│  │   (sw.js)    │                                                          │
│  └──────────────┘                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Faza 1: Konfiguracja PWA (Progressive Web App)

### 1.1 Instalacja vite-plugin-pwa

```bash
npm install vite-plugin-pwa --save-dev
```

### 1.2 Aktualizacja vite.config.ts

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  // ... istniejąca konfiguracja ...
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Nie cache'uj API requestów
        navigateFallbackDenylist: [/^\/api/, /^\/supabase/],
      },
      manifest: {
        name: 'Pure Life Center',
        short_name: 'PureLife',
        description: 'Zmieniamy życie i zdrowie ludzi na lepsze',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/dashboard',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      devOptions: {
        enabled: false // Włącz tylko gdy testujesz lokanie
      }
    }),
    // ... pozostałe pluginy
  ],
}));
```

### 1.3 Utworzenie ikon PWA

Potrzebne pliki w folderze `public/`:
- `pwa-192.png` (192x192px)
- `pwa-512.png` (512x512px)  
- `pwa-maskable-512.png` (512x512px z bezpiecznym marginesem)

### 1.4 Utworzenie Service Worker dla Push (`public/sw-push.js`)

```javascript
// Service Worker - obsługa push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let data = { title: 'Pure Life Center', body: 'Nowa wiadomość', url: '/messages' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }
  
  const options = {
    body: data.body,
    icon: '/pwa-192.png',
    badge: '/favicon.ico',
    tag: data.tag || 'default',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || '/messages',
      timestamp: Date.now()
    },
    actions: data.actions || [
      { action: 'open', title: 'Otwórz' },
      { action: 'dismiss', title: 'Zamknij' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Obsługa kliknięcia w powiadomienie
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();
  
  if (event.action === 'dismiss') return;
  
  const urlToOpen = event.notification.data?.url || '/messages';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Znajdź otwarte okno aplikacji
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // Jeśli brak otwartego okna - otwórz nowe
        return clients.openWindow(urlToOpen);
      })
  );
});

// Obsługa zamknięcia powiadomienia
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});
```

---

## Faza 2: Baza danych

### 2.1 Migracja SQL - Tabela subskrypcji push

```sql
-- Tabela przechowująca subskrypcje push dla każdego urządzenia użytkownika
CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dane subskrypcji Web Push
  endpoint text NOT NULL,
  p256dh text NOT NULL,  -- Klucz publiczny
  auth text NOT NULL,     -- Token autoryzacyjny
  
  -- Metadane urządzenia
  device_type text DEFAULT 'unknown', -- desktop, mobile, tablet
  browser text,                       -- chrome, firefox, safari, edge
  os text,                            -- windows, macos, ios, android
  device_name text,                   -- Opcjonalna nazwa urządzenia
  
  -- Timestampy
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  
  -- Unikalność: jeden endpoint na użytkownika
  UNIQUE(user_id, endpoint)
);

-- RLS
ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi tylko swoje subskrypcje
CREATE POLICY "Users can view own subscriptions"
  ON public.user_push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Użytkownik może dodawać swoje subskrypcje
CREATE POLICY "Users can insert own subscriptions"
  ON public.user_push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Użytkownik może usuwać swoje subskrypcje
CREATE POLICY "Users can delete own subscriptions"
  ON public.user_push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Użytkownik może aktualizować last_used_at
CREATE POLICY "Users can update own subscriptions"
  ON public.user_push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Indeksy
CREATE INDEX idx_push_subscriptions_user_id ON public.user_push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON public.user_push_subscriptions(endpoint);

-- Dodanie kolumny preferencji do istniejącej tabeli profili
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean DEFAULT true;
```

### 2.2 VAPID Keys (Web Push authorization)

Wymagane dodanie secretów do projektu:
- `VAPID_PUBLIC_KEY` - klucz publiczny (udostępniany klientowi)
- `VAPID_PRIVATE_KEY` - klucz prywatny (tylko backend)
- `VAPID_SUBJECT` - mailto:contact@purelife.info.pl

```bash
# Generowanie kluczy VAPID (jednorazowo)
npx web-push generate-vapid-keys
```

---

## Faza 3: Hook kliencki - usePushNotifications

### 3.1 Nowy hook `src/hooks/usePushNotifications.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const VAPID_PUBLIC_KEY = 'YOUR_GENERATED_PUBLIC_KEY'; // Z secretów

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  isLoading: boolean;
  error: string | null;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    isLoading: true,
    error: null
  });

  // Sprawdź wsparcie i aktualny stan
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'serviceWorker' in navigator && 
                          'PushManager' in window && 
                          'Notification' in window;
      
      if (!isSupported) {
        setState(s => ({ ...s, isSupported: false, isLoading: false }));
        return;
      }

      const permission = Notification.permission;
      
      // Sprawdź czy jest aktywna subskrypcja
      let isSubscribed = false;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed = !!subscription;
      } catch (e) {
        console.warn('[Push] Error checking subscription:', e);
      }

      setState({
        isSupported: true,
        isSubscribed,
        permission,
        isLoading: false,
        error: null
      });
    };

    checkSupport();
  }, []);

  // Funkcja subskrypcji
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    setState(s => ({ ...s, isLoading: true, error: null }));

    try {
      // 1. Poproś o uprawnienia
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(s => ({ ...s, permission, isLoading: false }));
        return false;
      }

      // 2. Zarejestruj Service Worker
      const registration = await navigator.serviceWorker.register('/sw-push.js');
      await navigator.serviceWorker.ready;

      // 3. Subskrybuj do Push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // 4. Wyciągnij dane subskrypcji
      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys!;

      // 5. Wykryj urządzenie
      const deviceInfo = detectDevice();

      // 6. Zapisz do bazy
      const { error } = await supabase
        .from('user_push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          device_type: deviceInfo.type,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          last_used_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) throw error;

      setState(s => ({ ...s, isSubscribed: true, permission: 'granted', isLoading: false }));
      return true;

    } catch (error: any) {
      console.error('[Push] Subscription error:', error);
      setState(s => ({ ...s, error: error.message, isLoading: false }));
      return false;
    }
  }, [user]);

  // Funkcja wypisania
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setState(s => ({ ...s, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Usuń z bazy
        await supabase
          .from('user_push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setState(s => ({ ...s, isSubscribed: false, isLoading: false }));
      return true;

    } catch (error: any) {
      console.error('[Push] Unsubscribe error:', error);
      setState(s => ({ ...s, error: error.message, isLoading: false }));
      return false;
    }
  }, [user]);

  return {
    ...state,
    subscribe,
    unsubscribe
  };
};

// Helpers
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function detectDevice() {
  const ua = navigator.userAgent;
  return {
    type: /Mobile|Android|iPhone|iPad/.test(ua) ? 'mobile' : 'desktop',
    browser: /Chrome/.test(ua) ? 'chrome' : /Firefox/.test(ua) ? 'firefox' : /Safari/.test(ua) ? 'safari' : 'other',
    os: /Windows/.test(ua) ? 'windows' : /Mac/.test(ua) ? 'macos' : /iPhone|iPad/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'other'
  };
}
```

---

## Faza 4: Edge Function do wysyłki push

### 4.1 Nowa funkcja `supabase/functions/send-push-notification/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushRequest {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, any>;
}

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@purelife.info.pl";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, url, tag, data }: PushRequest = await req.json();

    if (!user_id || !title || !body) {
      throw new Error("Missing required fields");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pobierz wszystkie subskrypcje użytkownika
    const { data: subscriptions, error } = await supabase
      .from("user_push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, reason: "no_subscriptions" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || "/messages",
      tag: tag || `msg-${Date.now()}`,
      ...data
    });

    // Wyślij do wszystkich urządzeń
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const response = await sendWebPush(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY, subject: VAPID_SUBJECT }
          );
          
          // Aktualizuj last_used_at przy sukcesie
          if (response.ok) {
            await supabase
              .from("user_push_subscriptions")
              .update({ last_used_at: new Date().toISOString() })
              .eq("id", sub.id);
          }
          
          // Usuń wygasłe subskrypcje (410 Gone)
          if (response.status === 410) {
            await supabase
              .from("user_push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }
          
          return { endpoint: sub.endpoint, status: response.status };
        } catch (e) {
          return { endpoint: sub.endpoint, error: e.message };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 201).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: subscriptions.length,
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[send-push-notification] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// Web Push sending implementation
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapid: { publicKey: string; privateKey: string; subject: string }
): Promise<Response> {
  // Implementacja zgodna z RFC 8291 (Web Push Protocol)
  // Wykorzystanie biblioteki web-push lub ręczna implementacja ECDH + HKDF
  
  const headers = {
    "Content-Type": "application/octet-stream",
    "Content-Encoding": "aes128gcm",
    "TTL": "86400", // 24 godziny
  };

  // ... pełna implementacja szyfrowania i podpisywania VAPID ...
  // (w praktyce użyj npm:web-push lub podobnej biblioteki)
  
  return fetch(subscription.endpoint, {
    method: "POST",
    headers,
    body: encryptedPayload
  });
}
```

---

## Faza 5: Integracja z istniejącym systemem

### 5.1 Trigger przy nowej wiadomości czatu

Modyfikacja funkcji wysyłającej wiadomość w `useUnifiedChat.ts`:

```typescript
// Po pomyślnym zapisaniu wiadomości
const sendDirectMessage = async (...) => {
  // ... istniejąca logika zapisu ...
  
  // Wywołaj Edge Function do push
  await supabase.functions.invoke('send-push-notification', {
    body: {
      user_id: recipientId,
      title: `${senderName}`,
      body: content.substring(0, 100),
      url: '/messages',
      tag: `chat-${channelId}`
    }
  });
};
```

### 5.2 Aktualizacja bannera uprawnień

Rozszerzenie `NotificationPermissionBanner.tsx` o obsługę push:

```tsx
const NotificationPermissionBanner = () => {
  const { isSupported, isSubscribed, subscribe, permission } = usePushNotifications();
  
  // Pokazuj banner tylko jeśli:
  // - Push jest wspierany
  // - Użytkownik nie jest jeszcze subskrybowany
  // - Użytkownik nie odmówił uprawnień
  
  if (!isSupported || isSubscribed || permission === 'denied') {
    return null;
  }
  
  return (
    <div className="bg-primary/10 border-b px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4" />
        <span className="text-sm">
          Włącz powiadomienia push, aby nie przegapić wiadomości
        </span>
      </div>
      <Button size="sm" onClick={subscribe}>
        Włącz powiadomienia
      </Button>
    </div>
  );
};
```

### 5.3 Instrukcja dla użytkowników iOS

Komponent informacyjny dla użytkowników iPhone/iPad:

```tsx
const IOSInstallInstructions = () => {
  const isIOS = /iPhone|iPad/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  if (!isIOS || isStandalone) return null;
  
  return (
    <Alert>
      <Smartphone className="h-4 w-4" />
      <AlertTitle>Powiadomienia na iPhone</AlertTitle>
      <AlertDescription>
        Aby otrzymywać powiadomienia push na iPhone:
        <ol className="list-decimal ml-4 mt-2 text-sm">
          <li>Kliknij ikonę "Udostępnij" (⬆️) w Safari</li>
          <li>Wybierz "Dodaj do ekranu początkowego"</li>
          <li>Otwórz aplikację z ekranu głównego</li>
          <li>Włącz powiadomienia w ustawieniach</li>
        </ol>
      </AlertDescription>
    </Alert>
  );
};
```

---

## Faza 6: Panel zarządzania w profilu użytkownika

### 6.1 Sekcja zarządzania urządzeniami

Nowy komponent w `MyAccount.tsx`:

```tsx
const PushDevicesManager = () => {
  const { data: devices } = useQuery({
    queryKey: ['push-devices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_push_subscriptions')
        .select('*')
        .order('last_used_at', { ascending: false });
      return data;
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Powiadomienia Push
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {devices?.map(device => (
            <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {device.device_type === 'mobile' ? <Smartphone /> : <Monitor />}
                <div>
                  <p className="font-medium">{device.browser} na {device.os}</p>
                  <p className="text-xs text-muted-foreground">
                    Ostatnio: {formatDistanceToNow(new Date(device.last_used_at))}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeDevice(device.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## Podsumowanie plików do utworzenia/modyfikacji

| Plik | Akcja | Opis |
|------|-------|------|
| `vite.config.ts` | Modyfikacja | Dodanie vite-plugin-pwa |
| `public/sw-push.js` | Utworzenie | Service Worker dla push |
| `public/pwa-192.png` | Utworzenie | Ikona PWA 192x192 |
| `public/pwa-512.png` | Utworzenie | Ikona PWA 512x512 |
| `public/pwa-maskable-512.png` | Utworzenie | Ikona maskable |
| `supabase/migrations/xxx_push_subscriptions.sql` | Utworzenie | Tabela subskrypcji |
| `src/hooks/usePushNotifications.ts` | Utworzenie | Hook obsługi push |
| `supabase/functions/send-push-notification/` | Utworzenie | Edge Function wysyłki |
| `src/components/messages/NotificationPermissionBanner.tsx` | Modyfikacja | Obsługa push |
| `src/hooks/useUnifiedChat.ts` | Modyfikacja | Trigger wysyłki push |
| `src/pages/MyAccount.tsx` | Modyfikacja | Zarządzanie urządzeniami |

---

## Wymagane secrety

| Secret | Opis |
|--------|------|
| `VAPID_PUBLIC_KEY` | Klucz publiczny VAPID (generowany jednorazowo) |
| `VAPID_PRIVATE_KEY` | Klucz prywatny VAPID |
| `VAPID_SUBJECT` | mailto:contact@purelife.info.pl |

---

## Wsparcie platform

| Platforma | Status | Uwagi |
|-----------|--------|-------|
| Android Chrome | ✅ Pełne | Działa od razu |
| Android Firefox | ✅ Pełne | Działa od razu |
| Windows Chrome | ✅ Pełne | Działa od razu |
| Windows Edge | ✅ Pełne | Działa od razu |
| Windows Firefox | ✅ Pełne | Działa od razu |
| macOS Safari | ✅ Pełne | Safari 16+ |
| macOS Chrome | ✅ Pełne | Działa od razu |
| iOS Safari | ⚠️ PWA | Wymaga dodania do ekranu głównego (iOS 16.4+) |
| iOS Chrome | ❌ Brak | Apple blokuje push w Chrome na iOS |

