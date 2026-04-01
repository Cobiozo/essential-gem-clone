

# Fix: Panel CMS admina nie ładuje się (infinite loading)

## Problem

W `Admin.tsx` stan `loading` startuje jako `true` (linia 180) i jest ustawiany na `false` **wyłącznie** wewnątrz `fetchData()` (linia 2152). Jednak `fetchData()` jest wywoływany tylko gdy `isAdmin === true` (linia 2117-2119).

Jeśli z jakiegokolwiek powodu `isAdmin` nie jest od razu `true` po załadowaniu auth (np. opóźnienie w `rolesReady`, chwilowa niespójność stanu), `fetchData()` nigdy się nie wywołuje i strona wisi na spinnerze na zawsze.

## Rozwiązanie

W `useEffect` na liniach 2108-2121, dodać `setLoading(false)` w dwóch brakujących przypadkach:

1. Gdy użytkownik nie jest adminem (`!isAdmin`) — ustawić `loading = false` i przekierować na dashboard
2. Gdy użytkownik nie jest zalogowany — `loading = false` przed navigate

### Zmiana w `src/pages/Admin.tsx`

```typescript
useEffect(() => {
  if (authLoading || !rolesReady) return;
  
  if (!user) {
    setLoading(false);        // <-- dodane
    navigate('/auth');
    return;
  }

  if (!isAdmin) {
    setLoading(false);        // <-- dodane
    navigate('/dashboard');   // <-- przekierowanie zamiast cichego return
    return;
  }

  fetchData();
}, [user, authLoading, rolesReady, isAdmin, navigate]);
```

| Plik | Zmiana |
|------|--------|
| `src/pages/Admin.tsx` | Dodać `setLoading(false)` przed `navigate` w obu wczesnych wyjściach z `useEffect` |

Zmiana dotyczy tylko 2 linii kodu.

