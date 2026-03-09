

# Fix: Reset hasła — "Nieprawidłowy link" mimo poprawnego linku

## Problem (root cause znaleziony)

Poprzedni fix dodał fallback sprawdzający `window.location.hash` na obecność `type=recovery`. Ale to **nie działa**, ponieważ:

1. Użytkownik klika link recovery → Supabase `/verify` przetwarza token → redirect 303 na `/reset-password#access_token=...&type=recovery`
2. **Supabase JS client automatycznie konsumuje hash fragment** (wymienia access_token na sesję) i **czyści go z URL**
3. Zanim `ResetPassword` useEffect się odpali, `window.location.hash` jest już **pusty**
4. Warunek `hasRecoveryParams` jest `false` → wchodzi w `else` → natychmiast ustawia `sessionChecked = true` z `isRecoverySession = false` → wyświetla "Nieprawidłowy link"

Dodatkowo: `AuthContext` (linie 295-312 App.tsx) blokuje renderowanie komponentów do momentu załadowania ról (`user && !rolesReady` → spinner). To daje Supabase jeszcze więcej czasu na wyczyszczenie hasha.

## Rozwiązanie

Nie polegać na `window.location.hash` — Supabase go czyści. Zamiast tego:

1. Nasłuchiwać na event `PASSWORD_RECOVERY` (zachować)
2. **Zawsze** sprawdzić `getSession()` po zamontowaniu — jeśli sesja istnieje na stronie `/reset-password`, traktować jako recovery session (jedyny sposób żeby tu trafić z sesją to przez link recovery)
3. Timeout 5s jako ostateczny fallback

### Zmiana w `src/pages/ResetPassword.tsx`:

```typescript
useEffect(() => {
  let timeoutId: NodeJS.Timeout;
  let resolved = false;

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    console.log("[ResetPassword] Auth event:", event);
    if (event === "PASSWORD_RECOVERY") {
      resolved = true;
      setIsRecoverySession(true);
      setSessionChecked(true);
      clearTimeout(timeoutId);
    }
  });

  // Fallback: Supabase clears the URL hash after consuming the token,
  // so we can't rely on window.location.hash.
  // Instead, check if a session already exists — if user landed here
  // with a session, it's from a recovery link.
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session && !resolved) {
      console.log("[ResetPassword] Session exists, treating as recovery");
      resolved = true;
      setIsRecoverySession(true);
      setSessionChecked(true);
      clearTimeout(timeoutId);
    }
  });

  // Final timeout — one last session check
  timeoutId = setTimeout(() => {
    if (!resolved) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsRecoverySession(true);
        }
        setSessionChecked(true);
      });
    }
  }, 3000);

  return () => {
    subscription.unsubscribe();
    clearTimeout(timeoutId);
  };
}, []);
```

Kluczowa zmiana: **usunięcie warunku `hasRecoveryParams`** — zawsze sprawdzamy sesję, bo hash jest już pusty gdy komponent się montuje.

### Plik do edycji:
- `src/pages/ResetPassword.tsx` — useEffect, usunięcie logiki sprawdzania hasha

