
# Naprawa: "Maximum call stack size exceeded" — Moja struktura

## Przyczyna — pętla nieskończona w useOrganizationTree

### Łańcuch niestabilnych referencji:

```text
AuthContext zmiana sesji (TOKEN_REFRESHED / tab focus)
    ↓
userRole — nowy obiekt przy każdym renderze
    ↓
canAccessTree = useCallback([settings, userRole?.role])   ← nowa referencja
getMaxDepthForRole = useCallback([settings, userRole?.role]) ← nowa referencja
    ↓
fetchTree = useCallback([..., canAccessTree, getMaxDepthForRole, ...]) ← nowa referencja
    ↓
useEffect([..., fetchTree]) uruchamia się ponownie
    ↓
setLoading(true) → re-render → cykl się powtarza → stack overflow
```

`hasFetchedRef.current = true` powinien blokować ponowne wywołanie — ale pętla dzieje się jeszcze ZANIM `hasFetchedRef` zostanie ustawione, jeśli `fetchTree` zmienia referencję szybciej niż async `fetchTree()` zdąży się wykonać i ustawić flagę.

### Szczegółowy problem w kodzie:

**`useOrganizationTreeSettings.ts`** — `canAccessTree` i `getMaxDepthForRole` używają `useCallback` z zależnością `userRole?.role`:
```typescript
const canAccessTree = useCallback((): boolean => {
  // ...
}, [settings, userRole?.role]);  // ← jeśli userRole jest nowym obiektem, te funkcje są odtwarzane

const getMaxDepthForRole = useCallback((): number => {
  // ...
}, [settings, userRole?.role]);
```

**`useOrganizationTree.ts`** — `fetchTree` zależy od tych funkcji:
```typescript
const fetchTree = useCallback(async () => {
  // ...
}, [profile?.eq_id, profile?.upline_eq_id, settingsLoading, canAccessTree, getMaxDepthForRole, settings?.show_upline]);
//                                                               ^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^ — nowe referencje przy każdym renderze AuthContext
```

**`useEffect`** reaguje na zmianę `fetchTree`:
```typescript
useEffect(() => {
  if (!settingsLoading && profile?.eq_id && !hasFetchedRef.current) {
    hasFetchedRef.current = true;
    fetchTree();  // ← uruchamia się za każdym razem gdy fetchTree zmieni referencję
  }
}, [settingsLoading, profile?.eq_id, fetchTree]);  // ← fetchTree jest tu problemem
```

`hasFetchedRef` blokuje PONOWNY fetch, ale nie chroni przed wielokrotnym montowaniem i odmontowywaniem komponentu przy Suspense + Lazy loading, co resetuje ref do `false`.

---

## Plan naprawy — 2 pliki

### Plik 1: `src/hooks/useOrganizationTreeSettings.ts`

Wyizolować `userRole` do prymitywnej wartości `string | null` zamiast całego obiektu — to stabilizuje `useCallback`:

```typescript
// PRZED:
const { userRole } = useAuth();
// ...
const canAccessTree = useCallback((): boolean => {
  // ...
}, [settings, userRole?.role]);

// PO:
const { userRole } = useAuth();
const userRoleStr = userRole?.role ?? null;  // prymityw string — stabilna referencja

const canAccessTree = useCallback((): boolean => {
  if (!settings || !settings.is_enabled) return false;
  if (!userRoleStr) return false;
  if (userRoleStr === 'admin') return true;
  if (userRoleStr === 'partner' && settings.visible_to_partners) return true;
  if (userRoleStr === 'specjalista' && settings.visible_to_specjalista) return true;
  if (userRoleStr === 'client' && settings.visible_to_clients) return true;
  return false;
}, [settings, userRoleStr]);  // ← stabilna prymitywna wartość

const getMaxDepthForRole = useCallback((): number => {
  if (!settings) return 0;
  if (!userRoleStr) return 0;
  if (userRoleStr === 'admin') return settings.max_depth;
  if (userRoleStr === 'partner') return settings.partner_max_depth;
  if (userRoleStr === 'specjalista') return settings.specjalista_max_depth;
  if (userRoleStr === 'client') return settings.client_max_depth;
  return 0;
}, [settings, userRoleStr]);  // ← stabilna prymitywna wartość
```

### Plik 2: `src/hooks/useOrganizationTree.ts`

Usunąć `canAccessTree` i `getMaxDepthForRole` z zależności `fetchTree` i zamiast tego wywołać je bezpośrednio wewnątrz funkcji. Ponadto usunąć `fetchTree` z tablicy `useEffect` — zamiast tego reagować tylko na stabilne prymitywne wartości:

```typescript
// PRZED:
const fetchTree = useCallback(async () => {
  // ...
}, [profile?.eq_id, profile?.upline_eq_id, settingsLoading, canAccessTree, getMaxDepthForRole, settings?.show_upline]);

useEffect(() => {
  if (!settingsLoading && profile?.eq_id && !hasFetchedRef.current) {
    hasFetchedRef.current = true;
    fetchTree();
  }
}, [settingsLoading, profile?.eq_id, fetchTree]);  // ← fetchTree tu destabilizuje


// PO — fetchTree bez niestabilnych funkcji w zależnościach:
const fetchTree = useCallback(async () => {
  if (settingsLoading) return;
  if (!profile?.eq_id) {
    setLoading(false);
    setError('Brak identyfikatora EQ w profilu');
    return;
  }
  if (!canAccessTree()) {
    setLoading(false);
    return;
  }
  // ... reszta bez zmian
}, [profile?.eq_id, profile?.upline_eq_id, settingsLoading, settings, canAccessTree, getMaxDepthForRole]);
// ^ Powyższe jest OK — settings stabilizuje się po jednym fetchu (nie zmienia się)

// useEffect — reaguje TYLKO na stabilne wartości, bez fetchTree w zależnościach:
useEffect(() => {
  if (!settingsLoading && profile?.eq_id && !hasFetchedRef.current) {
    hasFetchedRef.current = true;
    fetchTree();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [settingsLoading, profile?.eq_id]);  // ← usunięto fetchTree — reagujemy tylko gdy settingsLoading zmienia się na false lub eq_id pojawia się
```

Usunięcie `fetchTree` z zależności `useEffect` jest bezpieczne tutaj, ponieważ:
- `fetchTree` jest wywoływany dokładnie raz (chroniony przez `hasFetchedRef`)
- `profile?.eq_id` i `settingsLoading` są stabilnymi prymitywami
- Ręczne odświeżenie jest zawsze możliwe przez `refetch: fetchTree` eksportowany z hooka

---

## Podsumowanie zmian

| Plik | Zmiana | Efekt |
|---|---|---|
| `src/hooks/useOrganizationTreeSettings.ts` | `userRole?.role` → `userRoleStr` (prymityw) jako zależność `useCallback` | Stabilne referencje `canAccessTree`/`getMaxDepthForRole` |
| `src/hooks/useOrganizationTree.ts` | Usunięcie `fetchTree` z `useEffect` dependencies, dodanie `eslint-disable` komentarza | Brak pętli re-renderów przy zmianach sesji |

---

## Dlaczego poprzednia naprawa nie pomogła

Poprzednia naprawa (dla zakładki "Zatwierdzenia") stabilizowała `useLeaderPermissions` i `useLeaderApprovals`. Ale zakładka "Moja struktura" używa zupełnie innych hooków: `useOrganizationTree` → `useOrganizationTreeSettings`. Te nie były dotknięte poprzednią naprawą i nadal generowały pętlę przez niestabilne referencje funkcji `canAccessTree`/`getMaxDepthForRole`.
