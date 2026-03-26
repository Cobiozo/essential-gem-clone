
# Naprawa: auto-odświeżanie po odliczeniu 30s

## Problem
`window.location.reload()` jest wywoływany wewnątrz callback'a `setCountdown` (React state setter). React może zoptymalizować/odroczyć ten callback, przez co `reload()` nigdy się nie wykonuje. Dodatkowo closure `show` zamyka się nad `showBanner` — po re-renderze z `showBanner=true` event listener nie wywoła ponownie `startCountdown` jeśli baner jest już widoczny.

## Rozwiązanie
W pliku `src/components/pwa/SWUpdateBanner.tsx`:

1. **Przenieść logikę reload poza state setter** — użyć `useRef` do śledzenia countdown i osobnego `useEffect` który reaguje na wartość countdown osiągającą 0, wymuszając `window.location.reload()`.
2. **Upewnić się że `handleRefresh` natychmiast przeładowuje** — usunąć czekanie na `controllerchange`, od razu `reload()`.
3. **Dodać `forceReload` jako zabezpieczenie** — `setTimeout(reload, 31000)` jako fallback niezależny od React.

### Kluczowa zmiana w `startCountdown`:
```typescript
countdownRef.current = setInterval(() => {
  setCountdown(prev => prev - 1);
}, 1000);
```

### Nowy `useEffect` wymuszający reload:
```typescript
useEffect(() => {
  if (showBanner && countdown <= 0) {
    window.location.reload();
  }
}, [countdown, showBanner]);
```

### Fallback timeout (niezależny od React):
```typescript
// W startCountdown, po setInterval:
setTimeout(() => { window.location.reload(); }, AUTO_RELOAD_SECONDS * 1000 + 500);
```

## Plik do modyfikacji
| Plik | Zmiana |
|---|---|
| `src/components/pwa/SWUpdateBanner.tsx` | Wydzielić reload z state settera, dodać useEffect + fallback timeout |
