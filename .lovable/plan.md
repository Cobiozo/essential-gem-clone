

# Zmiany w timerze sesji: 1h, bez mousemove, przeniesienie do topbar

## 3 zmiany do wykonania

### 1. Timeout z 30 min → 1h + usunięcie `mousemove` z eventów aktywności
**Plik:** `src/hooks/useInactivityTimeout.ts`
- Zmiana `INACTIVITY_TIMEOUT_MS` z `30 * 60 * 1000` na `60 * 60 * 1000`
- Usunięcie `mousemove` z listy `activityEvents` — timer resetuje się tylko przy kliknięciach, scrollu, klawiaturze, touch, nawigacji

### 2. Przeniesienie zegara z fixed bottom-right do topbar (obok dzwoneczka)
**Plik:** `src/components/SessionTimer.tsx`
- Usunięcie `fixed bottom-4 right-4` — komponent staje się inline (bez pozycjonowania)
- Zmniejszenie do kompaktowej formy pasującej do topbar (ikona + czas + przycisk refresh)

**Plik:** `src/components/dashboard/DashboardTopbar.tsx`
- Import `SessionTimer` i renderowanie go obok `NotificationBell`
- Przekazanie `timeRemaining` i `onRefreshTimer` przez nowy kontekst lub portal

**Problem:** Timer jest obecnie renderowany w `InactivityHandler` (App.tsx), a topbar nie ma dostępu do stanu hooka. Rozwiązanie: przenieść rendering `SessionTimer` z `App.tsx` do `DashboardTopbar.tsx` i udostępnić stan timera przez React Context.

**Nowy plik:** `src/contexts/SessionTimerContext.tsx`
- Prosty context eksportujący `timeRemaining`, `onRefreshTimer`, `isProtectedRoute`
- Provider w `InactivityHandler` (App.tsx)
- Consumer w `DashboardTopbar`

### 3. App.tsx — usunięcie SessionTimer z InactivityHandler
**Plik:** `src/App.tsx`
- `InactivityHandler` opakowuje children w `SessionTimerProvider` zamiast renderować `SessionTimer` bezpośrednio
- `SessionTimeoutDialog` pozostaje w `InactivityHandler`

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/hooks/useInactivityTimeout.ts` | Timeout 1h, usunięcie `mousemove` |
| `src/contexts/SessionTimerContext.tsx` | Nowy context dla stanu timera |
| `src/components/SessionTimer.tsx` | Inline styling zamiast fixed position |
| `src/components/dashboard/DashboardTopbar.tsx` | Renderowanie SessionTimer obok NotificationBell |
| `src/App.tsx` | SessionTimerProvider zamiast bezpośredniego renderowania |

