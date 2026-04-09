

# Plan: Naprawa dwóch problemów

## Problem 1: Przypomnienia CRON nadal nie działają

**Diagnoza**: Kod w repozytorium jest poprawny (linia 449: `registered_at`), ale logi produkcyjne z dzisiaj (12:55) nadal pokazują błąd `column event_registrations.created_at does not exist`. Oznacza to, że Edge Function **nie została ponownie wdrożona** po ostatniej zmianie.

**Rozwiązanie**: Ponowne wdrożenie (deploy) funkcji `send-bulk-webinar-reminders`. Żadne zmiany w kodzie nie są potrzebne — wystarczy redeploy.

---

## Problem 2: Banner "nowa wersja" nie odlicza i nie przeładowuje

**Diagnoza**: Bug w `SWUpdateBanner.tsx`. Sekwencja zdarzeń:

1. Event `appVersionChanged` odpala → `show()` ustawia `showBanner(true)` i wywołuje `startCountdown()` (tworzy interval + timeout)
2. React re-renderuje bo `showBanner` się zmienił
3. `useEffect` na liniach 42-58 ma `[showBanner, startCountdown]` w zależnościach → **cleanup się odpala**
4. Cleanup na liniach 55-56 wywołuje `clearInterval(countdownRef.current)` i `clearTimeout(fallbackRef.current)` — **zabija oba timery** które właśnie wystartowały!
5. Efekt: banner widoczny, ale countdown zamrożony na 30s, auto-reload nigdy nie nastąpi

**Rozwiązanie**: Rozdzielić logikę event listenerów od logiki countdown. Countdown powinien startować w osobnym `useEffect` reagującym na `showBanner`, a nie być wywoływany wewnątrz handlera eventów który jest w efekcie z cleanup'em czyszczącym timery.

### Zmiana w `src/components/pwa/SWUpdateBanner.tsx`

```tsx
// useEffect #1 — tylko nasłuchuje eventów i ustawia showBanner
useEffect(() => {
  const show = () => setShowBanner(true);
  window.addEventListener('swUpdateAvailable', show);
  window.addEventListener('appVersionChanged', show);
  return () => {
    window.removeEventListener('swUpdateAvailable', show);
    window.removeEventListener('appVersionChanged', show);
  };
}, []);

// useEffect #2 — startuje countdown gdy banner się pojawi
useEffect(() => {
  if (!showBanner) return;
  
  setCountdown(AUTO_RELOAD_SECONDS);
  
  const interval = setInterval(() => {
    setCountdown(prev => prev - 1);
  }, 1000);
  
  const fallback = setTimeout(() => {
    window.location.reload();
  }, AUTO_RELOAD_SECONDS * 1000 + 500);
  
  return () => {
    clearInterval(interval);
    clearTimeout(fallback);
  };
}, [showBanner]);
```

Usunięcie `startCountdown` callback i `countdownRef`/`fallbackRef` — stają się zbędne bo lifecycle jest zarządzany przez cleanup efektu.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/pwa/SWUpdateBanner.tsx` | Rozdzielenie efektów — fix countdown |
| `send-bulk-webinar-reminders` | Redeploy (bez zmian w kodzie) |

