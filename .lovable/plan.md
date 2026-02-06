

# Plan: Kompleksowa naprawa systemu Push Notifications

## Wyniki audytu

### ✅ Co działa poprawnie:
1. **Konfiguracja VAPID** - klucze są poprawnie skonfigurowane w bazie danych
2. **Edge Function `get-vapid-public-key`** - zwraca poprawne dane (enabled: true, publicKey istnieje)
3. **Ikony w Supabase Storage** - wszystkie 3 ikony (192, 512, badge) są skonfigurowane
4. **Service Worker `sw-push.js`** - kod jest poprawny i kompletny
5. **Hook `usePushNotifications`** - logika subskrypcji jest prawidłowa
6. **Banner powiadomień** - używa nowego hooka z przyciskiem "Później"

### ❌ Krytyczne brakujące elementy:

| Problem | Wpływ | Priorytet |
|---------|-------|-----------|
| **Brak pliku `manifest.json`** | iOS nie rozpoznaje aplikacji jako PWA, blokuje Web Push | KRYTYCZNY |
| **Brak ikon PWA w folderze `public/`** | Brak `/pwa-192.png` i `/pwa-512.png` do których odwołuje się SW | KRYTYCZNY |
| **Brak linku do manifestu w `index.html`** | Przeglądarki nie wykrywają PWA | KRYTYCZNY |
| **Brak tagu `apple-touch-icon`** | iOS nie wyświetla poprawnej ikony przy "Dodaj do ekranu głównego" | WYSOKI |
| **Serwer produkcyjny nie zrestartowany** | Trasa `/sw-push.js` w server.js nie jest aktywna | KRYTYCZNY |

---

## Faza 1: Utworzenie pliku `manifest.json`

Stworzenie pełnego manifestu PWA w folderze `public/`:

```json
{
  "name": "Pure Life Center",
  "short_name": "PureLife",
  "description": "Zmieniamy życie i zdrowie ludzi na lepsze - centrum wsparcia dla partnerów i specjalistów",
  "start_url": "/",
  "id": "/",
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone", "minimal-ui"],
  "orientation": "portrait-primary",
  "background_color": "#ffffff",
  "theme_color": "#10b981",
  "scope": "/",
  "lang": "pl",
  "dir": "ltr",
  "categories": ["health", "business", "education"],
  "icons": [
    {
      "src": "/pwa-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/pwa-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/pwa-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [],
  "prefer_related_applications": false,
  "handle_links": "preferred"
}
```

---

## Faza 2: Aktualizacja `index.html`

Dodanie brakujących meta tagów dla PWA i iOS:

```html
<!-- W sekcji <head> po iOS PWA meta tags -->

<!-- Web App Manifest -->
<link rel="manifest" href="/manifest.json" />

<!-- Theme color for browser UI -->
<meta name="theme-color" content="#10b981" />

<!-- iOS App Icons -->
<link rel="apple-touch-icon" href="/pwa-192.png" />
<link rel="apple-touch-icon" sizes="192x192" href="/pwa-192.png" />
<link rel="apple-touch-icon" sizes="512x512" href="/pwa-512.png" />

<!-- iOS Splash Screens (opcjonalnie) -->
<meta name="apple-mobile-web-app-title" content="PureLife" />
```

---

## Faza 3: Utworzenie ikon PWA

Ponieważ nie mam dostępu do generowania grafik, utworzę placeholder ikony używając istniejącego logo z Supabase Storage. Użyję Edge Function do przekierowania lub skrypt do pobierania ikon z bazy konfiguracji.

### Opcja A: Ikony lokalne (rekomendowana)
Wymagane pliki do dodania do `public/`:
- `pwa-192.png` (192x192px)
- `pwa-512.png` (512x512px)
- `pwa-maskable-512.png` (512x512px z paddingiem dla safe zone)

### Opcja B: Dynamiczne przekierowanie w server.js
Dodanie tras przekierowujących do ikon z Supabase:

```javascript
// Ikony PWA - przekierowanie do ikon z konfiguracji
app.get('/pwa-192.png', async (req, res) => {
  // Pobierz URL z bazy lub użyj domyślnej
  const iconUrl = 'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/training-media/1770404696823-logo-1764373022335.png';
  res.redirect(302, iconUrl);
});

app.get('/pwa-512.png', async (req, res) => {
  const iconUrl = 'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/training-media/1770404468713-logo-1764373022335.png';
  res.redirect(302, iconUrl);
});
```

---

## Faza 4: Aktualizacja Service Worker

Dodanie obsługi manifestu w Service Worker (cache manifestu):

```javascript
// W sw-push.js - dodać na początku

const CACHE_NAME = 'purelife-pwa-v1';
const STATIC_ASSETS = [
  '/manifest.json',
  '/pwa-192.png',
  '/pwa-512.png',
];

// Cache manifest on install
self.addEventListener('install', (event) => {
  console.log('[SW-Push] Service Worker installed');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('[SW-Push] Failed to cache static assets:', err);
      });
    })
  );
  self.skipWaiting();
});
```

---

## Faza 5: Usprawnienia diagnostyczne w server.js

Dodanie endpointu diagnostycznego i obsługi manifestu:

```javascript
// Endpoint diagnostyczny dla PWA
app.get('/api/pwa-status', (req, res) => {
  const distPath = __dirname + '/dist';
  
  res.json({
    serverVersion: '1.3.0',
    timestamp: new Date().toISOString(),
    files: {
      swPush: fs.existsSync(path.join(distPath, 'sw-push.js')),
      manifest: fs.existsSync(path.join(distPath, 'manifest.json')),
      pwa192: fs.existsSync(path.join(distPath, 'pwa-192.png')),
      pwa512: fs.existsSync(path.join(distPath, 'pwa-512.png')),
    },
    publicFiles: {
      swPush: fs.existsSync(path.join(__dirname, 'public', 'sw-push.js')),
      manifest: fs.existsSync(path.join(__dirname, 'public', 'manifest.json')),
    }
  });
});

// Manifest z prawidłowym MIME type
app.get('/manifest.json', (req, res) => {
  const manifestPath = path.join(__dirname, 'dist', 'manifest.json');
  
  if (fs.existsSync(manifestPath)) {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(manifestPath);
  } else {
    const publicPath = path.join(__dirname, 'public', 'manifest.json');
    if (fs.existsSync(publicPath)) {
      res.setHeader('Content-Type', 'application/manifest+json');
      res.sendFile(publicPath);
    } else {
      res.status(404).send('Manifest not found');
    }
  }
});
```

---

## Faza 6: Podsumowanie zmian

| Plik | Akcja | Opis |
|------|-------|------|
| `public/manifest.json` | **NOWY** | Pełny manifest PWA z ikonami, theme color, scope |
| `public/pwa-192.png` | **NOWY** | Ikona 192x192 (pobrana z Supabase lub utworzona) |
| `public/pwa-512.png` | **NOWY** | Ikona 512x512 (pobrana z Supabase lub utworzona) |
| `index.html` | Modyfikacja | Dodanie `<link rel="manifest">`, `apple-touch-icon`, `theme-color` |
| `public/sw-push.js` | Modyfikacja | Dodanie cache dla manifestu i ikon |
| `server.js` | Modyfikacja | Dodanie endpointu diagnostycznego `/api/pwa-status`, obsługa `/manifest.json` |

---

## Wymagane działania na produkcji

Po wdrożeniu tych zmian wymagane jest:

1. **`git pull`** - pobranie nowych plików
2. **`npm run build`** - zbudowanie projektu (kopiuje `public/*` do `dist/`)
3. **`pm2 restart ecosystem.config.js`** - restart serwera Express

### Weryfikacja:
```bash
curl -I https://purelife.info.pl/sw-push.js
# Powinno zwrócić: Content-Type: application/javascript

curl -I https://purelife.info.pl/manifest.json
# Powinno zwrócić: Content-Type: application/manifest+json

curl https://purelife.info.pl/api/pwa-status
# Powinno zwrócić JSON z informacją o plikach
```

---

## Dlaczego to rozwiąże problemy?

### Windows (Edge):
- Błąd MIME type zniknie po restarcie serwera (trasa `/sw-push.js` już jest w kodzie)
- Manifest pozwoli na instalację jako PWA

### iOS (Safari):
- **Manifest jest WYMAGANY** dla Web Push na iOS 16.4+
- `apple-touch-icon` zapewni poprawną ikonę przy "Dodaj do ekranu głównego"
- `display: standalone` w manifeście aktywuje tryb PWA

### Android (Chrome):
- Pełny manifest umożliwi "Zainstaluj aplikację" prompt
- Service Worker z cache zapewni szybsze ładowanie

