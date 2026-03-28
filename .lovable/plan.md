

## Plan: Automatyczny tryb konserwacji podczas wdrażania dist/

### Problem
Podczas kopiowania nowego folderu `dist/` na serwer produkcyjny, pliki JS/CSS są chwilowo niekompletne lub niedostępne — użytkownicy widzą białą stronę lub błędy.

### Rozwiązanie
Dwa pliki: statyczna strona `maintenance.html` + logika detekcji w `server.js` która automatycznie przełącza na tryb konserwacji gdy wykryje niestabilność plików w `dist/`.

### 1. Utworzyć `maintenance.html` (nowy plik w katalogu głównym)
- Samodzielna strona HTML (zero zewnętrznych zależności — inline CSS)
- Styl zgodny z brandingiem PureLife (zielony motyw, logo tekstowe)
- Treść: "Trwa aktualizacja systemu", "Strona będzie dostępna za chwilę"
- Auto-odświeżanie co 5 sekund (`<meta http-equiv="refresh" content="5">`)
- Animacja ładowania (spinner CSS)

### 2. Zmodyfikować `server.js` — detekcja niestabilności dist/

**Nowa sekcja po konfiguracji serwera (po linii 42):**

Stan maintenance:
```
let isMaintenanceMode = false;
let lastDistCheck = { totalSize: 0, mtimeMax: 0 };
```

**Funkcja `checkDistStability()`** — wywoływana co 3 sekundy (setInterval):
1. Sprawdza czy `dist/index.html` istnieje — jeśli nie → maintenance ON
2. Skanuje pliki w `dist/assets/` — zbiera sumaryczny rozmiar i najnowszy mtime
3. Porównuje z poprzednim odczytem:
   - Jeśli rozmiar lub mtime się zmieniły → maintenance ON (trwa kopiowanie)
   - Jeśli 2 kolejne odczyty identyczne → maintenance OFF (kopiowanie zakończone)
4. Loguje zmiany stanu do konsoli

**Middleware maintenance (przed routami, po linii 158):**
- Sprawdza `isMaintenanceMode`
- Dla żądań API (`/health`, `/upload`, `/list-files`) — przepuszcza
- Dla pozostałych — serwuje `maintenance.html` z kodem 503

**SPA fallback (linia 505-510):**
- Dodaje sprawdzenie: jeśli `dist/index.html` nie istnieje → serwuj `maintenance.html`

### 3. Logika stabilności — szczegóły

```text
Cykl sprawdzania (co 3s):
  ┌─ Odczyt: totalSize + mtimeMax plików w dist/assets/
  │
  ├─ Zmiana wykryta? → maintenance = true, zapisz snapshot
  │
  └─ Brak zmian (2x z rzędu)? → maintenance = false
```

Tolerancja: wymaga **2 stabilnych odczytów** (6 sekund bez zmian) zanim wyłączy tryb konserwacji — zapobiega przedwczesnemu przełączeniu gdy kopiowanie trwa partiami.

### Pliki do modyfikacji
1. **`maintenance.html`** — nowy plik, statyczna strona konserwacji
2. **`server.js`** — dodanie detekcji + middleware maintenance

### Co pozostaje bez zmian
- Folder `dist/` i build process
- Wszystkie istniejące endpointy (upload, health, PWA, video streaming)
- Graceful shutdown

