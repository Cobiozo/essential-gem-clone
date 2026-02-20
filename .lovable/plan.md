
# Naprawa: "Maximum call stack size exceeded" — Panel Lidera

## Zidentyfikowane przyczyny (3 błędy)

### Błąd 1 (KRYTYCZNY): `LeaderApprovalView` wywołuje `useLeaderApprovals()` bez parametru

W `src/components/leader/LeaderApprovalView.tsx`, linia 38-39:
```typescript
// PRZED — brak parametru hasApprovalPermission:
const { pendingApprovals, isLoading, approveUser, rejectUser, isApproving, isRejecting } =
  useLeaderApprovals();  // ← enabled = !!user && undefined === true → false, ale...
```

Hook `useLeaderApprovals` ma sygnaturę:
```typescript
export function useLeaderApprovals(hasApprovalPermission?: boolean)
// enabled: !!user && hasApprovalPermission === true
```

Gdy `hasApprovalPermission` jest `undefined`, wyrażenie `undefined === true` = `false`, więc query nie startuje. **To jednak nie jest bezpośredni powód pętli** — ale gdy lider KLIKNIE zakładkę "Zatwierdzenia", komponent jest montowany i wywołuje RPC bez ochrony.

### Błąd 2 (KRYTYCZNY): `useLeaderPermissions` — niestabilna referencja `isPartner`/`isAdmin`

Hook `useLeaderPermissions` wywołuje:
```typescript
const { user, isPartner, isAdmin } = useAuth();
```

i używa `isPartner`/`isAdmin` wewnątrz `queryFn`. Jeśli `isPartner`/`isAdmin` są nowe obiekty/referencje przy każdym renderze (np. gettery, computed), `queryKey: ['leader-permissions-full', user?.id]` jest stabilny, ale **logika w queryFn** używa domknięcia — przy każdej zmianie stanu w AuthContext może się wielokrotnie uruchamiać.

Ponadto w `enabled`:
```typescript
enabled: !!user && (isPartner || isAdmin),
```
Jeśli `isPartner` lub `isAdmin` zwraca nową referencję przy każdym renderze, powoduje to ciągłe przeliczanie `enabled`, co może wywoływać nieskończony cykl re-renderów.

### Błąd 3 (KRYTYCZNY): `LeaderPanel.tsx` — `useLeaderApprovals` wywoływany przed załadowaniem uprawnień

```typescript
const {
  hasApprovalPermission,
  loading: permLoading,
} = useLeaderPermissions();

const { pendingCount } = useLeaderApprovals(hasApprovalPermission);
```

W czasie ładowania (`permLoading === true`) wartość `hasApprovalPermission` to `false` (domyślna). Po załadowaniu zmienia się na `true` lub `false`. Ta zmiana powoduje ponowne obliczenie `enabled` w `useLeaderApprovals` → refetch → aktualizacja stanu → re-render → pętla jeśli coś w AuthContext wyzwala re-render useLeaderPermissions.

Diagram przepływu:
```text
AuthContext zmiana sesji
    ↓
useLeaderPermissions re-run (enabled zależy od isPartner/isAdmin)
    ↓
hasApprovalPermission zmienia wartość
    ↓
useLeaderApprovals re-run (enabled zmienia się)
    ↓
RPC get_pending_leader_approvals rzuca błąd SQL
    ↓
React łapie błąd → re-render → AuthContext → ... (pętla)
```

### Błąd 4 (DODATKOWY): `LeaderApprovalView` — podwójne wywołanie `useLeaderApprovals`

`LeaderPanel.tsx` wywołuje `useLeaderApprovals(hasApprovalPermission)` dla `pendingCount` na poziomie strony.  
`LeaderApprovalView` wywołuje `useLeaderApprovals()` **ponownie** (bez parametru) gdy zakładka jest renderowana.

To powoduje **dwie instancje hooka** — jedna z `enabled: true`, jedna z `enabled: false`. Przy równoczesnej zmianie stanu mogą wchodzić w kolizję i generować kaskadowe re-rendery.

---

## Plan naprawy — 3 pliki

### Plik 1: `src/components/leader/LeaderApprovalView.tsx`

Zmiana: Przekazać `hasApprovalPermission: true` do hooka (komponent jest renderowany TYLKO gdy uprawnienie jest przyznane), oraz zreużyć instancję hooka z LeaderPanel przez props zamiast wywoływać hook drugi raz.

Najprościej: przekazać dane z góry przez props zamiast ponownie wywoływać hook.

```typescript
// PRZED:
export const LeaderApprovalView: React.FC = () => {
  const { pendingApprovals, isLoading, approveUser, rejectUser, isApproving, isRejecting } =
    useLeaderApprovals();  // ← brak parametru

// PO — dodać props i wywołanie z true:
interface LeaderApprovalViewProps {
  // opcjonalne — jeśli nie podane, hook zakłada że ma uprawnienie (bo komponent renderowany tylko gdy ma)
}
export const LeaderApprovalView: React.FC = () => {
  const { pendingApprovals, isLoading, approveUser, rejectUser, isApproving, isRejecting } =
    useLeaderApprovals(true);  // ← zawsze true, bo komponent jest renderowany wyłącznie gdy hasApprovalPermission === true
```

### Plik 2: `src/hooks/useLeaderPermissions.ts`

Zmiana: Wyizolować `isPartner` i `isAdmin` z AuthContext — upewnić się że `enabled` jest stabilne i nie powoduje re-renderów przez nowe referencje.

```typescript
// PRZED:
const { user, isPartner, isAdmin } = useAuth();
// ...
enabled: !!user && (isPartner || isAdmin),

// PO — skonwertować do Boolean żeby mieć stabilną prymitywną wartość:
const { user, isPartner, isAdmin } = useAuth();
const isPartnerBool = Boolean(isPartner);
const isAdminBool = Boolean(isAdmin);
// ...
enabled: !!user?.id && (isPartnerBool || isAdminBool),
queryKey: ['leader-permissions-full', user?.id, isPartnerBool, isAdminBool],
// queryFn używa isPartnerBool / isAdminBool zamiast isPartner / isAdmin
```

### Plik 3: `src/hooks/useLeaderApprovals.ts`

Zmiana: Dodać `retry: false` jest już ustawione. Dodać też `throwOnError: false` żeby błąd RPC nie propagował się do Error Boundary i nie wywoływał pętli re-renderów:

```typescript
// PO:
const { data: pendingApprovals = [], isLoading } = useQuery({
  queryKey: ['leader-pending-approvals', user?.id],
  queryFn: async () => { ... },
  enabled: !!user?.id && hasApprovalPermission === true,
  staleTime: 30 * 1000,
  refetchInterval: 60 * 1000,
  retry: false,
  throwOnError: false,  // ← nowe: błąd SQL nie propaguje do ErrorBoundary
});
```

---

## Podsumowanie zmian

| Plik | Zmiana | Priorytet |
|---|---|---|
| `src/components/leader/LeaderApprovalView.tsx` | `useLeaderApprovals()` → `useLeaderApprovals(true)` | KRYTYCZNY |
| `src/hooks/useLeaderPermissions.ts` | Stabilizacja `enabled` przez `Boolean()` + rozszerzony `queryKey` | KRYTYCZNY |
| `src/hooks/useLeaderApprovals.ts` | Dodanie `throwOnError: false` + stabilizacja `enabled` | WYSOKI |

---

## Dlaczego to powoduje "Maximum call stack"

React podczas obsługi błędu w renderze wywołuje re-render komponentu nadrzędnego → ten re-renderuje dzieci → dzieci ponownie rzucają błąd → kolejny re-render. Przy wystarczającej głębokości drzewa komponentów stos wywołań funkcji zostaje wyczerpany i JavaScript rzuca "Maximum call stack size exceeded". Naprawienie guard'ów uprawnień i izolacja błędów RPC od ErrorBoundary przerwie tę pętlę.
