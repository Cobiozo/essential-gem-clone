

# Plan: Naprawa powiadomień Push na produkcji

## Zidentyfikowane problemy

### 1. **BŁĄD KRYTYCZNY: Service Worker zwraca nieprawidłowy MIME type**

Na screenshocie widoczny jest błąd:
```
Failed to register a ServiceWorker for scope ('https://purelife.info.pl/') 
with script ('https://purelife.info.pl/sw-push.js'): 
The script has an unsupported MIME type ('text/html').
```

**Przyczyna:** Serwer produkcyjny (Express w `server.js`) przy żądaniu `/sw-push.js` zwraca `index.html` z typem `text/html` zamiast samego pliku JavaScript.

**Analiza kodu `server.js`:**
- Linia 207-225: Serwer serwuje pliki statyczne z folderu `dist`
- Linia 386-388: Wildcard route `app.get('*')` zwraca `index.html` dla wszystkich nieznanych tras (SPA fallback)

**Problem:** Plik `sw-push.js` istnieje w folderze `public/` (w repozytorium), ale podczas buildu Vite może nie kopiować go do `dist/` lub serwer nie znajduje go i fallbackuje do `index.html`.

---

### 2. **PROBLEM: Banner używa starego systemu powiadomień**

Plik `NotificationPermissionBanner.tsx` używa starego hooka `useBrowserNotifications` zamiast nowego `usePushNotifications`:

```typescript
// OBECNY KOD (nieprawidłowy):
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
const { permission, requestPermission, isSupported } = useBrowserNotifications();

// Pokazuje się tylko gdy permission === 'default'
if (!isSupported || permission !== 'default') return null;
```

**Skutek:** 
- Jeśli użytkownik kiedyś zezwolił na powiadomienia (permission = 'granted'), banner NIE pojawi się
- Ale użytkownik może NIE mieć aktywnej subskrypcji Push w nowym systemie VAPID

---

### 3. **PROBLEM: Brak przycisku "Odrzuć na później"**

Obecny banner ma tylko przycisk "Włącz powiadomienia", bez opcji odrzucenia.

---

## Faza 1: Naprawa konfiguracji serwera (MIME type)

### 1.1 Dodanie jawnej obsługi Service Worker w `server.js`

Przed wildcard route `app.get('*')` musi być jawna obsługa pliku `sw-push.js`:

```javascript
// DODAĆ PRZED app.get('*', ...)

// Service Worker - musi być serwowany z prawidłowym MIME type i odpowiednim scope
app.get('/sw-push.js', (req, res) => {
  const swPath = path.join(__dirname, 'dist', 'sw-push.js');
  
  if (fs.existsSync(swPath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(swPath);
  } else {
    // Fallback to public folder (dev mode)
    const publicSwPath = path.join(__dirname, 'public', 'sw-push.js');
    if (fs.existsSync(publicSwPath)) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(publicSwPath);
    } else {
      res.status(404).send('Service Worker not found');
    }
  }
});
```

### 1.2 Weryfikacja konfiguracji Vite

Upewnić się, że Vite kopiuje `public/sw-push.js` do `dist/` podczas buildu. 

Vite domyślnie kopiuje wszystko z `public/` do `dist/` - ale warto to zweryfikować w konfiguracji.

---

## Faza 2: Aktualizacja NotificationPermissionBanner

### 2.1 Zamiana hooka na `usePushNotifications`

```typescript
// src/components/messages/NotificationPermissionBanner.tsx
import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const DISMISS_KEY = 'push_notification_banner_dismissed';
const DISMISS_DURATION_DAYS = 7;

export const NotificationPermissionBanner = () => {
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    pushConfig, 
    subscribe, 
    isLoading,
    error
  } = usePushNotifications();
  
  const [dismissed, setDismissed] = useState(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) return false;
    const daysElapsed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
    return daysElapsed < DISMISS_DURATION_DAYS;
  });

  // Nie pokazuj jeśli:
  // - Push nie jest wspierany
  // - Push nie jest włączony w panelu admina
  // - Użytkownik ma już aktywną subskrypcję
  // - Użytkownik odrzucił na później
  // - Uprawnienia zostały trwale zablokowane
  if (!isSupported || !pushConfig?.enabled || isSubscribed || dismissed || permission === 'denied') {
    return null;
  }

  const handleEnable = async () => {
    await subscribe();
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  return (
    <Alert className="mx-4 mt-4 border-primary/20 bg-primary/5 relative">
      <Bell className="h-4 w-4 text-primary" />
      <AlertTitle className="text-foreground">Włącz powiadomienia Push</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          Otrzymuj powiadomienia o nowych wiadomościach nawet gdy przeglądarka jest zamknięta.
        </span>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleDismiss}
          >
            Później
          </Button>
          <Button 
            size="sm" 
            onClick={handleEnable} 
            disabled={isLoading}
          >
            {isLoading ? 'Włączanie...' : 'Włącz powiadomienia'}
          </Button>
        </div>
      </AlertDescription>
      {error && (
        <p className="text-xs text-destructive mt-2">{error}</p>
      )}
    </Alert>
  );
};
```

---

## Faza 3: Poprawność szyfrowania (weryfikacja)

### Analiza obecnego systemu szyfrowania:

1. **Klucze VAPID** - generowane przez Edge Function `generate-vapid-keys` przy użyciu biblioteki `web-push`
2. **Klucze subskrypcji** (`p256dh`, `auth`) - generowane przez przeglądarkę podczas subskrypcji i zapisywane w tabeli `user_push_subscriptions`
3. **Szyfrowanie wysyłki** - Edge Function `send-push-notification` używa:
   ```typescript
   webpush.setVapidDetails(
     subject,
     publicKey,
     privateKey
   );
   
   await webpush.sendNotification(
     { endpoint, keys: { p256dh, auth } },
     JSON.stringify(payload)
   );
   ```

**Szyfrowanie jest POPRAWNE** - biblioteka `web-push` automatycznie szyfruje payload używając:
- ECDH (Elliptic Curve Diffie-Hellman) do wymiany kluczy
- AES-128-GCM do szyfrowania treści
- VAPID do autoryzacji

---

## Faza 4: Obsługa błędu Service Worker w UI

W komponencie `CurrentDevicePanel.tsx` jest już obsługa błędu, ale można dodać więcej kontekstu:

```typescript
// Rozszerzona obsługa błędu w CurrentDevicePanel
{error && (
  <Alert variant="destructive" className="mt-4">
    <AlertCircle className="w-4 h-4" />
    <AlertDescription>
      {error.includes('MIME type') ? (
        <>
          <strong>Błąd konfiguracji serwera:</strong> Plik Service Worker (sw-push.js) 
          jest serwowany z nieprawidłowym typem MIME. Sprawdź konfigurację serwera produkcyjnego.
        </>
      ) : (
        error
      )}
    </AlertDescription>
  </Alert>
)}
```

---

## Podsumowanie zmian

| Plik | Akcja | Opis |
|------|-------|------|
| `server.js` | Modyfikacja | Dodanie jawnej obsługi `/sw-push.js` z prawidłowym MIME type |
| `src/components/messages/NotificationPermissionBanner.tsx` | Modyfikacja | Zamiana na `usePushNotifications`, dodanie "Później" |
| `src/components/admin/push-notifications/CurrentDevicePanel.tsx` | Modyfikacja | Lepszy komunikat błędu dla MIME type |
| `vite.config.ts` | Weryfikacja | Upewnienie się, że public/ jest kopiowany do dist/ |

---

## Oczekiwane rezultaty po zmianach

1. **Service Worker** będzie poprawnie rejestrowany na produkcji (prawidłowy MIME type)
2. **Banner powiadomień** pojawi się dla użytkowników:
   - Którzy nie mają aktywnej subskrypcji Push (nawet jeśli wcześniej zezwolili na powiadomienia)
   - Z opcją "Później" ukrywającą banner na 7 dni
3. **Panel admina** będzie wyświetlał jasny komunikat o błędzie konfiguracji serwera
4. **Powiadomienia Push** będą działać na produkcji po wygenerowaniu kluczy VAPID i włączeniu systemu

