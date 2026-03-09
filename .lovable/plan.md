

# Naprawa ciągłego przeładowywania widoku struktury w Panelu Lidera

## Zidentyfikowane problemy

W `useOrganizationTree.ts` są **3 powiązane przyczyny** ciągłego przeładowywania:

### 1. Realtime subscription nasłuchuje WSZYSTKICH zmian w `profiles`
Kanał `postgres_changes` reaguje na każdy UPDATE dowolnego profilu w systemie (np. `last_seen`, `updated_at`). Każde takie zdarzenie resetuje `hasFetchedRef = false` i wywołuje `fetchTree()` z pełnym spinnerem ładowania (`setLoading(true)`).

### 2. Niestabilne referencje callbacków powodują teardown subskrypcji
- `canAccessTree()` i `getMaxDepthForRole()` zależą od obiektu `settings` (nowa referencja po każdym setState)
- `fetchTree` zależy od tych callbacków → zmiana referencji
- Efekt realtime (linia 194) zależy od `fetchTree` → unsubscribe/resubscribe przy każdej zmianie

### 3. Brak debounce'a na zdarzeniach realtime
Nawet uzasadnione zdarzenia (np. admin zmienia `is_active`) mogą przyjść seriami, powodując wielokrotne pełne przeładowania.

## Plan naprawy — `src/hooks/useOrganizationTree.ts`

1. **Stabilizacja callbacków** — użyć `useRef` dla `settings` i `userRole`, aby `canAccessTree`/`getMaxDepthForRole`/`fetchTree` miały stałe referencje
2. **Rozdzielić initial load od refresh** — `setLoading(true)` tylko przy pierwszym ładowaniu; przy odświeżaniu realtime dane aktualizują się w tle bez spinnera
3. **Debounce realtime** — 2-sekundowy debounce na zdarzeniach z `profiles` i `user_blocks`, żeby serie zdarzeń nie powodowały wielokrotnych fetchów
4. **Usunąć `fetchTree` z zależności efektu realtime** — użyć `ref` do przechowywania aktualnej wersji `fetchTree`

### Konkretne zmiany w kodzie:

```typescript
// Refs for stable callbacks
const settingsRef = useRef(settings);
settingsRef.current = settings;

const fetchTreeRef = useRef(fetchTree);
fetchTreeRef.current = fetchTree;

// fetchTree — no setLoading(true) on refetch
const isInitialLoadRef = useRef(true);
// In fetchTree: setLoading only when isInitialLoadRef.current is true
// After first successful fetch: isInitialLoadRef.current = false

// Realtime effect — stable, no fetchTree in deps
useEffect(() => {
  const debounceTimer = { current: null as any };
  const channel = supabase
    .channel('org-tree-profiles-realtime')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        hasFetchedRef.current = false;
        fetchTreeRef.current();
      }, 2000);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_blocks' }, () => {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        hasFetchedRef.current = false;
        fetchTreeRef.current();
      }, 1000);
    })
    .subscribe();

  return () => {
    clearTimeout(debounceTimer.current);
    supabase.removeChannel(channel);
  };
}, []); // Empty deps — stable subscription
```

Plik do edycji: **`src/hooks/useOrganizationTree.ts`**

