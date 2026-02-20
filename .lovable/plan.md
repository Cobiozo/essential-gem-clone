
# Naprawa: Maximum call stack size exceeded po wyczyszczeniu cookies

## Diagnoza problemu

Błąd pojawia się po wyczyszczeniu cookies na stronie `/admin?tab=users`. Po analizie kodu, zidentyfikowałem **dwie powiązane przyczyny**:

### Przyczyna 1 — Hook useLeaderApprovals wywołany bezwarunkowo w LeaderPanel.tsx

Linia 31 w `LeaderPanel.tsx`:
```typescript
const { pendingCount } = useLeaderApprovals();  // ← wywołany dla KAŻDEGO użytkownika
```

Hook ma `enabled: !!user` — więc wysyła RPC `get_pending_leader_approvals` dla każdego zalogowanego użytkownika. Ta funkcja SQL rzuca `RAISE EXCEPTION 'Brak uprawnień'` dla użytkowników bez `can_approve_registrations = true`. To powoduje błąd, który trafia do React Query jako thrown error — co może wywołać re-render komponentu, który wywołuje hook ponownie, itd.

**Naprawa:** Dodać `enabled: !!user && hasApprovalPermission` w `useLeaderApprovals` — lub przekazać flagę z zewnątrz.

### Przyczyna 2 — Efekt w Admin.tsx z niestabilnymi zależnościami

Linia 2063-2064 w `Admin.tsx`:
```typescript
}, [user, authLoading, rolesReady, isAdmin, navigate, toast]);
```

`toast` i `navigate` to obiekty tworzone na nowo przy każdym renderze (choć są stabilne w React Router v6 i Sonner, ale `toast` z `useToast()` może być niestabilna referencja). Jeśli po wyczyszczeniu cookies `isAdmin` zmienia się szybko (false → undefined → false), może to powodować wielokrotne wywołania `fetchData()` i `navigate('/auth')` jednocześnie.

**Naprawa:** Usunąć `toast` z zależności efektu (użyć `useCallback` lub `useRef` dla stabilności), i dodać guard `isAdmin` przed `fetchData()`.

### Przyczyna 3 — Brak guard w useLeaderApprovals na błędy "Brak uprawnień"

Funkcja RPC rzuca wyjątek zamiast zwracać pusty wynik dla użytkowników bez uprawnień. Hook obsługuje ten przypadek (`if (error.message?.includes('Brak uprawnień')) return []`), ale błąd SQL jest najpierw logowany w konsoli, a następnie React Query może przy pewnych konfiguracjach retry wywołać ponowne zapytanie, co prowadzi do pętli.

Obecna konfiguracja hooka ma `refetchInterval: 60 * 1000` — co oznacza, że co minutę ponawia próbę dla użytkowników bez uprawnień.

**Naprawa:** Dodać `enabled: !!user && hasApprovalPermission` do query w `useLeaderApprovals`, a do `LeaderPanel.tsx` przekazać tę flagę.

---

## Plan naprawy

### Zmiana 1: `src/hooks/useLeaderApprovals.ts`

Dodać parametr `enabled` (domyślnie `true`) do hooka lub przyjąć `hasApprovalPermission` jako argument:

```typescript
export function useLeaderApprovals(hasApprovalPermission?: boolean) {
  const { user } = useAuth();
  
  const { data: pendingApprovals = [], isLoading } = useQuery({
    queryKey: ['leader-pending-approvals', user?.id],
    queryFn: async () => { ... },
    enabled: !!user && hasApprovalPermission === true,  // ← kluczowa zmiana
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: false,  // ← nie ponawiaj prób gdy brak uprawnień
  });
```

### Zmiana 2: `src/pages/LeaderPanel.tsx`

Przekazać `hasApprovalPermission` do `useLeaderApprovals`:

```typescript
// Linia 31 — zmiana z:
const { pendingCount } = useLeaderApprovals();

// Na:
const { pendingCount } = useLeaderApprovals(hasApprovalPermission);
```

### Zmiana 3: `src/pages/Admin.tsx` — stabilizacja efektu

Linia 2054-2064 — usunąć `toast` z listy zależności efektu (jest stabilna referencja, ale jej obecność w deps powoduje potencjalną pętlę przy reinicjalizacji kontekstu po wyczyszczeniu cookies):

```typescript
useEffect(() => {
    if (authLoading || !rolesReady) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!isAdmin) return;  // ← dodać guard — nie wywołuj fetchData dla nie-adminów
    fetchData();
}, [user, authLoading, rolesReady, isAdmin, navigate]);
//  ↑ usunięto: toast
```

### Zmiana 4: `src/hooks/useLeaderApprovals.ts` — dodanie `retry: false`

Aby zapobiec ponownym próbom zapytania gdy RPC rzuca błąd uprawnień:

```typescript
retry: false,
```

---

## Pliki do zmiany

| Plik | Zmiana | Priorytet |
|------|--------|-----------|
| `src/hooks/useLeaderApprovals.ts` | Dodanie parametru `hasApprovalPermission`, `enabled: !!user && hasApprovalPermission === true`, `retry: false` | Krytyczny |
| `src/pages/LeaderPanel.tsx` | Przekazanie `hasApprovalPermission` do `useLeaderApprovals(hasApprovalPermission)` | Krytyczny |
| `src/pages/Admin.tsx` | Usunięcie `toast` z deps efektu + dodanie `if (!isAdmin) return` guard | Ważny |

Zmiany są minimalne i celowe — naprawiają konkretne miejsca bez ryzyka destabilizacji reszty aplikacji.
