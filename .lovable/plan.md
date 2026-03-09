

# Fix: Reset hasła — "Nieprawidłowy link" mimo poprawnego linku

## Problem

Zdarzenie `PASSWORD_RECOVERY` z Supabase jest emitowane **zanim** komponent `ResetPassword` zdąży zamontować się i zarejestrować swój listener `onAuthStateChange`. Sekwencja:

1. Użytkownik klika link → Supabase `/verify` przetwarza token → redirect na `/reset-password#access_token=...&type=recovery`
2. `AuthContext` (zamontowany na poziomie App) łapie `SIGNED_IN` — użytkownik jest zalogowany
3. `ResetPassword` montuje się i rejestruje listener — ale `PASSWORD_RECOVERY` event już się zdarzył
4. Po 5s timeout → `isRecoverySession = false` → "Nieprawidłowy link"

Logi auth potwierdzają: login przez `/verify` o 09:22:05, potem drugie `/verify` o 09:22:30 → "One-time token not found" (token już zużyty).

## Rozwiązanie

W `ResetPassword.tsx` — oprócz nasłuchiwania na event `PASSWORD_RECOVERY`, dodać **fallback**: po zamontowaniu sprawdzić `supabase.auth.getSession()`. Jeśli URL zawiera `type=recovery` w hashu **i** istnieje aktywna sesja, traktować to jako sesję recovery (event już się zdarzył przed mount).

```typescript
// W useEffect, po zarejestrowaniu listenera:
const hash = window.location.hash;
const hasRecoveryParams = hash.includes('type=recovery');

if (hasRecoveryParams) {
  // Fallback: sprawdź czy sesja już istnieje (event PASSWORD_RECOVERY mógł się zdarzać przed mount)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session && !resolved) {
      resolved = true;
      setIsRecoverySession(true);
      setSessionChecked(true);
      clearTimeout(timeoutId);
    }
  });

  timeoutId = setTimeout(() => {
    if (!resolved) {
      // Ostatnia próba — może sesja zdążyła się załadować
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsRecoverySession(true);
        }
        setSessionChecked(true);
      });
    }
  }, 5000);
} else {
  // Brak parametrów recovery — sprawdź jeszcze czy jest sesja (użytkownik mógł kliknąć link wcześniej)
  setSessionChecked(true);
}
```

### Plik do edycji:
- `src/pages/ResetPassword.tsx` — dodanie fallbacku `getSession()` obok eventu `PASSWORD_RECOVERY`

