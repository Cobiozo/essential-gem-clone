

# Naprawa widżetu "Aktywni użytkownicy"

## Zdiagnozowane problemy

### Problem 1: Race condition przy inicjalizacji
Event `sync` wywołuje się PRZED `trackPresence()`, więc pierwszy sync pokazuje pustą listę. Dopiero gdy inny użytkownik dołączy/opuści kanał, dane się odświeżą.

### Problem 2: Throttling blokuje początkową aktualizację
Linie 62-64 w `useUserPresence.ts` ograniczają aktualizacje do max 1/sekundę. Jeśli `sync` i `join` (własny) wywołają się w odstępie <1s, druga aktualizacja jest ignorowana.

### Problem 3: Brak periodycznego odświeżania
Po pierwszym `track()` nie ma mechanizmu ponownego wywołania `updateUserList()`. Użytkownicy są widoczni tylko gdy ktoś nowy dołączy/opuści kanał przez Realtime.

### Problem 4: 60-sekundowy próg `isActive`
Jeśli użytkownik nie wykonuje żadnych akcji przez 60s, jest oznaczany jako `isActive: false` i nie jest liczony w `stats`. Brak mechanizmu periodycznego `track()` by aktualizować `lastActivity`.

---

## Plan naprawy

### Krok 1: Wymusić aktualizację po własnym `track()`

Po wywołaniu `trackPresence()` w callbacku `subscribe`, dodać krótkie opóźnienie i ponowne wywołanie `updateUserList()`:

```typescript
if (status === 'SUBSCRIBED' && mountedRef.current) {
  setIsConnected(true);
  if (isTabVisible) {
    await trackPresence();
    // Po własnym track(), poczekaj aż Realtime zaktualizuje state i odśwież listę
    setTimeout(() => {
      if (mountedRef.current) updateUserList();
    }, 500);
  }
}
```

### Krok 2: Dodać periodyczny "heartbeat" dla `lastActivity`

Dodać interval który co 30 sekund aktualizuje `lastActivity` obecnego użytkownika, żeby nie znikał z listy aktywnych:

```typescript
// Heartbeat - aktualizuj lastActivity co 30s
const heartbeatInterval = setInterval(() => {
  if (isTabVisible && mountedRef.current && channelRef.current) {
    trackPresence();
  }
}, 30000);

// W cleanup:
clearInterval(heartbeatInterval);
```

### Krok 3: Nie throttlować pierwszej aktualizacji

Zmodyfikować logikę throttlingu, aby przepuścić pierwszą aktualizację (gdy `lastUpdateRef.current === 0`):

```typescript
const updateUserList = () => {
  if (!mountedRef.current) return;
  
  const now = Date.now();
  // Przepuść pierwszą aktualizację lub te starsze niż 1s
  if (lastUpdateRef.current !== 0 && now - lastUpdateRef.current < 1000) return;
  lastUpdateRef.current = now;
  
  // ... reszta logiki
};
```

### Krok 4: Dodać periodyczne odświeżanie listy

Oprócz heartbeat dla siebie, periodycznie sprawdzać presenceState() by wychwycić użytkowników którzy stali się nieaktywni:

```typescript
// Odświeżaj listę co 15s żeby aktualizować statusy isActive
const refreshInterval = setInterval(() => {
  if (mountedRef.current) updateUserList();
}, 15000);

// W cleanup:
clearInterval(refreshInterval);
```

---

## Plik do modyfikacji

`src/hooks/useUserPresence.ts`

---

## Podsumowanie zmian

| Zmiana | Efekt |
|--------|-------|
| Timeout po `trackPresence()` | Widżet pokaże bieżącego użytkownika natychmiast po połączeniu |
| Heartbeat co 30s | Użytkownicy nie znikną po 60s nieaktywności |
| Nie throttlować pierwszej aktualizacji | Początkowy stan będzie poprawny |
| Refresh listy co 15s | Statusy `isActive` będą aktualne |

---

## Sekcja techniczna

### Szczegółowe zmiany w `src/hooks/useUserPresence.ts`

**Zmiana 1 - Zmodyfikować throttling (linie 58-64):**
```typescript
const updateUserList = () => {
  if (!mountedRef.current) return;
  
  const now = Date.now();
  // Allow first update, then throttle to 1/second
  if (lastUpdateRef.current !== 0 && now - lastUpdateRef.current < 1000) return;
  lastUpdateRef.current = now;
  
  // ... reszta bez zmian
};
```

**Zmiana 2 - Dodać intervale w useEffect (po linii 139):**
```typescript
// Heartbeat - keep lastActivity fresh
const heartbeatInterval = setInterval(() => {
  if (isTabVisible && mountedRef.current && channelRef.current) {
    trackPresence();
  }
}, 30000);

// Periodic refresh to update isActive statuses
const refreshInterval = setInterval(() => {
  if (mountedRef.current) {
    lastUpdateRef.current = 0; // Reset throttle for forced update
    updateUserList();
  }
}, 15000);
```

**Zmiana 3 - Wywołać updateUserList po track w subscribe (linie 162-167):**
```typescript
if (status === 'SUBSCRIBED' && mountedRef.current) {
  setIsConnected(true);
  if (isTabVisible) {
    await trackPresence();
    // Force update after own track completes
    setTimeout(() => {
      if (mountedRef.current) {
        lastUpdateRef.current = 0; // Reset throttle
        updateUserList();
      }
    }, 500);
  }
}
```

**Zmiana 4 - Cleanup intervalów (w return, przed linią 177):**
```typescript
clearInterval(heartbeatInterval);
clearInterval(refreshInterval);
```

