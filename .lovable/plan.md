

# Plan: Optymalizacja server.js dla Phusion Passenger na cPanel

## Zidentyfikowane problemy

| Problem | Opis | Status w kodzie |
|---------|------|-----------------|
| **SIGKILL vs SIGTERM** | Passenger używa SIGKILL, który nie wywołuje handlerów | Handlery SIGTERM/SIGINT są nieefektywne |
| **Brak timeoutów keep-alive** | Połączenia wiszą przez długi czas | `keepAliveTimeout` i `headersTimeout` nie ustawione |
| **Brak obsługi SIGHUP** | Passenger wysyła SIGHUP przy restarcie | Brak handlera |
| **server.close() nie wywoływany** | Graceful shutdown nie zamyka serwera prawidłowo | `process.exit(0)` natychmiast |
| **Brak trackingu połączeń** | Nie wiemy ile połączeń jest aktywnych | Brak mechanizmu |

---

## Proponowane rozwiązania

### 1. Konfiguracja timeoutów serwera

Krytyczne dla zapobiegania "wiszącym" połączeniom:

```javascript
const server = app.listen(PORT, HOST, () => {
  // ... log startup
});

// KRYTYCZNE: Timeouty dla Passenger
server.keepAliveTimeout = 5000;   // 5s - zamknij idle connections szybciej
server.headersTimeout = 10000;    // 10s - timeout na nagłówki
server.timeout = 30000;           // 30s - ogólny timeout requestu
```

### 2. Tracking aktywnych połączeń

Monitorowanie połączeń dla graceful shutdown:

```javascript
const activeConnections = new Set();

server.on('connection', (socket) => {
  activeConnections.add(socket);
  socket.on('close', () => {
    activeConnections.delete(socket);
  });
});

// Endpoint do sprawdzenia stanu
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeConnections: activeConnections.size,  // NOWE
    pid: process.pid,                            // NOWE - dla debugowania
  });
});
```

### 3. Ulepszone graceful shutdown

Prawidłowe zamykanie z obsługą wszystkich sygnałów:

```javascript
let isShuttingDown = false;

const gracefulShutdown = (signal) => {
  // Zapobiegaj wielokrotnemu wywołaniu
  if (isShuttingDown) {
    console.log(`[Shutdown] Already shutting down, ignoring ${signal}`);
    return;
  }
  isShuttingDown = true;
  
  console.log(`[Shutdown] ${signal} received, starting graceful shutdown...`);
  console.log(`[Shutdown] Active connections: ${activeConnections.size}`);
  
  // Przestań przyjmować nowe połączenia
  server.close((err) => {
    if (err) {
      console.error('[Shutdown] Error closing server:', err);
      process.exit(1);
    }
    console.log('[Shutdown] Server closed successfully');
    process.exit(0);
  });
  
  // Zamknij istniejące połączenia delikatnie
  activeConnections.forEach((socket) => {
    // Wyślij FIN, ale daj czas na dokończenie
    socket.end();
  });
  
  // Fallback: wymuś zamknięcie po 10s
  setTimeout(() => {
    console.warn('[Shutdown] Forcing exit after timeout');
    activeConnections.forEach((socket) => {
      socket.destroy();
    });
    process.exit(0);
  }, 10000).unref(); // .unref() - nie blokuj zamykania przez ten timer
};

// Obsługa wszystkich sygnałów
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));  // NOWE

// Obsługa nieoczekiwanych błędów
process.on('uncaughtException', (err) => {
  console.error('[Fatal] Uncaught exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Fatal] Unhandled rejection:', reason);
  gracefulShutdown('unhandledRejection');
});
```

### 4. Passenger-specific: Middleware dla szybkiego zamykania

Odrzucaj nowe requesty podczas shutdown:

```javascript
// Middleware: odrzuć requesty podczas shutdown
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.setHeader('Connection', 'close');
    return res.status(503).json({
      error: 'Server is shutting down',
      retryAfter: 5
    });
  }
  next();
});
```

### 5. Connection: close header dla Passenger

Pomaga w szybszym zwalnianiu połączeń:

```javascript
// Dla Passenger: sugeruj zamknięcie połączenia po odpowiedzi
app.use((req, res, next) => {
  // Na shared hostingu preferuj krótkie połączenia
  if (process.env.PASSENGER_APP_ENV || process.env.SHARED_HOSTING) {
    res.setHeader('Connection', 'close');
  }
  next();
});
```

---

## Sekcja techniczna: Pełna struktura zmian

### Zmieniony plik: `server.js`

```javascript
// ========================================
// SERVER CONFIGURATION
// ========================================

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const PRODUCTION_DOMAIN = process.env.PRODUCTION_DOMAIN || 'https://purelife.info.pl';

// Shutdown state
let isShuttingDown = false;
const activeConnections = new Set();

// ... (middleware setup - bez zmian)

// Shutdown-aware middleware (PRZED innymi routes)
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.setHeader('Connection', 'close');
    return res.status(503).json({
      error: 'Server is shutting down',
      retryAfter: 5
    });
  }
  next();
});

// ... (routes - bez zmian)

// ========================================
// SERVER STARTUP WITH PROPER CONFIG
// ========================================

const server = app.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log('🚀 PureLife Server');
  console.log('='.repeat(60));
  console.log(`📍 Server running at: http://${HOST}:${PORT}`);
  console.log(`🌐 Host: s108.cyber-folks.pl`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📁 Uploads directory: ${UPLOADS_DIR}`);
  console.log(`🔧 PID: ${process.pid}`);
  console.log(`📅 Started at: ${new Date().toLocaleString('pl-PL')}`);
  console.log('='.repeat(60));
});

// KRYTYCZNE: Timeouty dla Phusion Passenger
server.keepAliveTimeout = 5000;    // 5 sekund
server.headersTimeout = 10000;     // 10 sekund  
server.timeout = 30000;            // 30 sekund

// Track aktywnych połączeń
server.on('connection', (socket) => {
  activeConnections.add(socket);
  socket.on('close', () => {
    activeConnections.delete(socket);
  });
});

// ========================================
// GRACEFUL SHUTDOWN
// ========================================

const gracefulShutdown = (signal) => {
  if (isShuttingDown) {
    console.log(`[Shutdown] Already in progress, ignoring ${signal}`);
    return;
  }
  isShuttingDown = true;
  
  console.log(`\n[Shutdown] ${signal} received`);
  console.log(`[Shutdown] Active connections: ${activeConnections.size}`);
  console.log(`[Shutdown] Closing server...`);
  
  server.close((err) => {
    if (err) {
      console.error('[Shutdown] Server close error:', err);
      process.exit(1);
    }
    console.log('[Shutdown] Server closed successfully');
    process.exit(0);
  });
  
  // Gracefully end existing connections
  activeConnections.forEach((socket) => {
    socket.end();
  });
  
  // Force exit after 10s (unref = don't keep process alive)
  setTimeout(() => {
    console.warn('[Shutdown] Timeout - forcing exit');
    activeConnections.forEach((socket) => socket.destroy());
    process.exit(0);
  }, 10000).unref();
};

// Signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// Error handlers
process.on('uncaughtException', (err) => {
  console.error('[Fatal] Uncaught exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[Fatal] Unhandled rejection:', reason);
  // Nie zamykaj - tylko loguj (może być nieistotne)
});
```

---

## Dodatkowe zalecenia dla Passenger na cPanel

### Plik `.htaccess` (jeśli używany)

```apache
PassengerAppRoot /home/username/public_html
PassengerStartupFile server.js
PassengerAppType node
PassengerNodejs /usr/bin/node

# Krótszy idle time
PassengerPoolIdleTime 60
PassengerMaxPoolSize 2
```

### Zmienne środowiskowe

Ustaw w panelu cPanel lub `.env`:

```bash
PASSENGER_APP_ENV=production
SHARED_HOSTING=true
NODE_ENV=production
```

---

## Podsumowanie zmian

| Element | Przed | Po |
|---------|-------|-----|
| `keepAliveTimeout` | Brak (domyślnie 5s w Node 18+) | Jawnie 5000ms |
| `headersTimeout` | Brak (domyślnie 60s) | 10000ms |
| `server.timeout` | Brak (domyślnie 0 = bez limitu) | 30000ms |
| SIGHUP handler | Brak | Dodany |
| Connection tracking | Brak | `activeConnections` Set |
| Shutdown middleware | Brak | 503 podczas shutdown |
| `setTimeout().unref()` | Brak | Użyty w fallback |
| `server.close()` | Nie wywoływany | Prawidłowo wywoływany |
| uncaughtException | Brak | Handler z shutdown |

---

## Uwaga o SIGKILL

**SIGKILL nie może być obsłużony** - to jest sygnał "natychmiastowego zabicia" procesu na poziomie kernela. Nie ma na to sposobu w żadnym języku programowania.

Rozwiązanie: Upewnij się, że Passenger NIE używa SIGKILL jako pierwszego sygnału. W konfiguracji Passenger:

```apache
# Daj procesowi czas na graceful shutdown
PassengerMaxRequestTime 60
```

Jeśli Passenger nadal używa SIGKILL, to jest problem konfiguracji hostingu - skontaktuj się z Cyberfolks.

