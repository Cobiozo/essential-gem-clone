

## Audyt: Dlaczego blad wystepuje na przegladarce Edge

### Znaleziona przyczyna

Problem lezy w pliku `server.js` - konkretnie w **SPA fallback route** (linia 505-506):

```javascript
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```

Ta trasa **nie ustawia zadnych naglowkow Cache-Control**. Porownaj z `express.static` (linia 231-234), ktory poprawnie ustawia `no-cache` dla plikow `.html`:

```javascript
if (filePath.endsWith('.html')) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
}
```

### Dlaczego Edge jest bardziej podatny

1. **`express.static` obsluguje tylko bezposrednie zadania plikow** (np. `/index.html`). Ale uzytkownik wchodzi na `/dashboard`, `/knowledge` itp. -- te trasy NIE trafiaja do `express.static`, tylko do SPA fallback `app.get('*')`.
2. SPA fallback serwuje `index.html` **bez naglowkow `Cache-Control`** -- przegladarka moze cachowac odpowiedz.
3. Edge (Chromium) ma bardziej agresywne cachowanie odpowiedzi HTTP niz Chrome w niektorych scenariuszach -- szczegolnie na urzadzeniach z wlaczonym "Efficiency Mode" lub "Sleeping Tabs".
4. Meta tagi `<meta http-equiv="Cache-Control">` w HTML sa **ignorowane** przez nowoczesne przegladarki -- tylko prawdziwe naglowki HTTP kontroluja cache.

### Lancuch zdarzen prowadzacy do bledu

```text
1. Uzytkownik wchodzi na /dashboard
2. SPA fallback serwuje index.html BEZ naglowkow no-cache
3. Edge cachuje ta odpowiedz HTML
4. Wdrazana jest nowa wersja (nowe hashe chunkow JS)
5. Uzytkownik wraca na strone
6. Edge serwuje STARY HTML z cache (odnosi sie do starych chunkow)
7. Stare chunki nie istnieja na serwerze → 404
8. lazyWithRetry probuje 4 razy → wszystkie 404
9. ErrorBoundary wyswietla "Cos poszlo nie tak"
10. Auto-reload laduje ponownie stary HTML z cache → petla
```

### Dodatkowy problem: Service Worker wzmacnia efekt

Service Worker w `sw-push.js` (linia 80-84) cachuje `/assets/` z strategia **cache-first bez TTL**:

```javascript
if (url.pathname.startsWith('/assets/') && /\.[a-f0-9]{8,}\./.test(url.pathname)) {
  event.respondWith(cacheFirst(event.request, CACHE_ASSETS));
  // brak maxAge = cache na zawsze
}
```

Choc nowe chunki maja nowe hashe (wiec nie beda w cache SW), to stary `index.html` (z cache Edge) moze odwolywac sie do chunkow, ktore nigdy nie istnialy na nowym serwerze.

### Plan naprawy

#### 1. Dodac naglowki Cache-Control do SPA fallback (`server.js`, linia 505-506)

Zmiana:
```javascript
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```

To jest **krytyczna poprawka** -- gwarantuje, ze przegladarka (w tym Edge) zawsze pobierze swiezy `index.html` z serwera.

#### 2. Dodac globalny middleware dla nawigacji (opcjonalnie, dodatkowe zabezpieczenie)

Przed SPA fallback dodac middleware, ktory dla kazdego zadania typu `text/html` (nawigacja) ustawia naglowki no-cache:

```javascript
app.use((req, res, next) => {
  if (req.accepts('html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});
```

### Podsumowanie

| Element | Status | Problem |
|---------|--------|---------|
| `express.static` dla `.html` | OK | Poprawne naglowki `no-cache` |
| SPA fallback `app.get('*')` | BUG | **Brak naglowkow cache** |
| SW cache-first dla assets | OK | Nowe hashe = nowe pliki, brak konfliktu |
| Meta tagi w HTML | Bezuzyteczne | Ignorowane przez przegladarki |

### Plik do zmiany

- `server.js` -- linia 505-506: dodanie naglowkow `Cache-Control` do SPA fallback

### Dlaczego to dziala na Chrome a nie na Edge

Chrome czesciej wykonuje tzw. "heuristic revalidation" nawet bez jawnych naglowkow cache. Edge w trybie oszczedzania energii (Efficiency Mode) i z wlaczonymi Sleeping Tabs agresywniej cachuje odpowiedzi bez jawnych naglowkow -- uznaje je za "mozliwe do cache'owania" na dluzej. Dodanie jawnych naglowkow `no-cache` eliminuje te roznice miedzy przegladarkami.

