

# Automatyczne wykrywanie nowej wersji aplikacji — Version Polling

## Problem

Obecny mechanizm (`SWUpdateBanner`) działa tylko gdy zmieni się sam plik `sw-push.js`. Gdy zmieniają się pliki aplikacji (nowe chunki JS), Service Worker się nie aktualizuje i użytkownik nie dostaje powiadomienia o nowej wersji.

## Rozwiązanie

Dodać mechanizm **version polling** — aplikacja co 60 sekund sprawdza plik `/version.json` (generowany przy buildzie). Jeśli wersja się zmieni, użytkownik zobaczy baner z wymuszeniem odświeżenia.

### Nowe pliki

**1. `public/version.json`** — plik wersji (statyczny placeholder, nadpisywany przy buildzie):
```json
{ "version": "1.0.0", "buildTime": 0 }
```

**2. Skrypt build w `vite.config.ts`** — plugin generujący `version.json` z timestampem przy każdym buildzie (`closeBundle` hook). Dzięki temu każdy deploy = nowa wersja.

**3. `src/hooks/useVersionPolling.ts`** — hook sprawdzający `/version.json` co 60s:
- Przy pierwszym załadowaniu zapisuje aktualną wersję
- Przy kolejnych porównuje — jeśli się zmieniła, dispatchuje event `appVersionChanged`
- Sprawdza tylko gdy zakładka jest aktywna (`visibilitychange`)

### Zmiany w istniejących plikach

**4. `src/components/pwa/SWUpdateBanner.tsx`** — rozszerzyć o nasłuchiwanie `appVersionChanged` (oprócz istniejącego `swUpdateAvailable`). Dodać opcję auto-reload po 30s z odliczaniem — jeśli użytkownik nie kliknie "Odśwież", aplikacja odświeży się sama.

**5. `src/App.tsx`** — dodać `useVersionPolling()` w głównym komponencie.

### Przepływ

```text
Build → generuje version.json z timestampem
  ↓
Użytkownik otwiera stronę → hook zapisuje wersję
  ↓
Co 60s → fetch /version.json (cache-bust)
  ↓
Wersja inna? → baner "Nowa wersja" + auto-reload po 30s
```

### Pliki do edycji/utworzenia:
- `public/version.json` — nowy (placeholder)
- `vite.config.ts` — dodać plugin generujący version.json
- `src/hooks/useVersionPolling.ts` — nowy hook
- `src/components/pwa/SWUpdateBanner.tsx` — rozszerzyć o version polling + auto-reload countdown
- `src/App.tsx` — dodać useVersionPolling()

