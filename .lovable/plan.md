
# Naprawa: Błąd w "Pure-Kontakty" i "Moja struktura" — korzeń problemu

## Rzeczywista przyczyna — 2 niezależne błędy

### Błąd 1 (KRYTYCZNY): `fetchTree` nadal ma niestabilne zależności w `useCallback`

W `useOrganizationTree.ts`, linia 34-99:
```typescript
const fetchTree = useCallback(async () => {
  // ...
  if (!canAccessTree()) { ... }
  const maxDepth = getMaxDepthForRole();
  // ...
}, [profile?.eq_id, profile?.upline_eq_id, settingsLoading, canAccessTree, getMaxDepthForRole, settings?.show_upline]);
//                                                               ^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^ ← WCIĄŻ NIESTABILNE
```

Poprzednia naprawa usunęła `fetchTree` z `useEffect`, ale **nie usunęła `canAccessTree` i `getMaxDepthForRole` z tablicy `useCallback`**. Oznacza to, że:
- `fetchTree` nadal zmienia referencję przy każdym renderze AuthContext
- Eksportowane `refetch: fetchTree` jest niestabilną referencją
- `useEffect` w innych komponentach, które zależą od `fetchTree`, mogą się zapętlić

### Błąd 2 (KRYTYCZNY): `TeamContactsTab` wywołuje `useOrganizationTree()` bezpośrednio

Linia 67 w `TeamContactsTab.tsx`:
```typescript
const { tree, upline, statistics, settings: treeSettings, canAccessTree, loading: treeLoading } = useOrganizationTree();
```

Ten komponent renderuje się za każdym razem gdy użytkownik odwiedza "Pure-Kontakty". Wywołuje `useOrganizationTree()`, który wewnętrznie wywołuje `useOrganizationTreeSettings()`. Obie instancje hooków (`TeamContactsTab` + ewentualne inne) są niezależne — każda ma własny `hasFetchedRef` inicjalizowany jako `false`.

Linia 81:
```typescript
const [activeTab, setActiveTab] = useState<...>(clientOnlyView && canSearchSpecialists ? 'search' : 'private');
```

`canSearchSpecialists` pochodzi z `useSpecialistSearch()`. Jeśli zmienia się, zmienia się `activeTab` → re-render → ponowne wywołanie `useOrganizationTree()`.

Linia 206:
```typescript
const visibleTabsCount = (clientOnlyView ? 0 : 2) + (canSearchSpecialists ? 1 : 0) + (canAccessTree() ? 1 : 0);
```

`canAccessTree()` jest wywoływana w każdym renderze. Jeśli `canAccessTree` zmienia referencję (bo `useCallback` w `useOrganizationTreeSettings` rekonstruuje funkcję), React może wykryć zmiany i wymusić re-render.

## Rozwiązanie — 2 pliki

### Plik 1: `src/hooks/useOrganizationTree.ts`

**Problem:** `canAccessTree` i `getMaxDepthForRole` w `useCallback` powodują niestabilność `fetchTree`.

**Rozwiązanie:** Usunąć `canAccessTree` i `getMaxDepthForRole` z tablicy zależności `fetchTree`. Zamiast tego — odczytać wynik tych funkcji raz przed `useCallback`, jako stabilne wartości, lub wywołać je wewnątrz bez dodawania do deps:

```typescript
// PRZED (linia 99):
}, [profile?.eq_id, profile?.upline_eq_id, settingsLoading, canAccessTree, getMaxDepthForRole, settings?.show_upline]);

// PO — usunąć canAccessTree i getMaxDepthForRole z deps (są stabilne jeśli useOrganizationTreeSettings działa poprawnie):
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [profile?.eq_id, profile?.upline_eq_id, settingsLoading, settings]);
```

`settings` jest stabilnym obiektem (zmieniany tylko po fetchSettings), więc jest bezpieczny jako zależność. `canAccessTree` i `getMaxDepthForRole` są zamknięciami na `settings` i `userRoleStr` — obie wartości są zawarte w `settings` i `profile`, więc `fetchTree` będzie działać poprawnie bez ich jawnego podawania w deps.

### Plik 2: `src/components/team-contacts/TeamContactsTab.tsx`

**Problem:** `TeamContactsTab` zawsze wywołuje `useOrganizationTree()`, nawet gdy użytkownik nie ma dostępu do drzewa (np. klienci). To powoduje niepotrzebny fetch i potencjalne błędy dla użytkowników bez uprawnień.

**Rozwiązanie:** Zastąpić `useOrganizationTree()` lżejszym `useOrganizationTreeSettings()`. `TeamContactsTab` potrzebuje jedynie:
- `canAccessTree()` — do decyzji czy pokazać zakładkę "Struktura"
- `treeSettings?.default_view` — do ustawienia domyślnego widoku
- `tree`, `upline`, `statistics` — **tylko gdy użytkownik kliknie zakładkę "Struktura"**

Dane drzewa (`tree`, `upline`, `statistics`) powinny być ładowane leniwie — tylko gdy zakładka "Struktura" jest aktywna. Można to osiągnąć przez wydzielenie komponentu `StructureTabContent` z lazy loadingiem (analogicznie jak `LeaderOrgTreeView` w `LeaderPanel.tsx` używa `Suspense`).

Konkretne zmiany w `TeamContactsTab.tsx`:

```typescript
// PRZED (linia 15-16):
import { useOrganizationTree } from '@/hooks/useOrganizationTree';
// ...
const { tree, upline, statistics, settings: treeSettings, canAccessTree, loading: treeLoading } = useOrganizationTree();

// PO — użyć tylko useOrganizationTreeSettings (lżejszy hook bez RPC):
import { useOrganizationTreeSettings } from '@/hooks/useOrganizationTreeSettings';
// ...
const { settings: treeSettings, canAccessTree } = useOrganizationTreeSettings();
```

A treść zakładki "Struktura" (`tree`, `upline`, `statistics`) powinna być renderowana przez oddzielny komponent `StructureTab`, który wewnętrznie woła `useOrganizationTree()` — dzięki temu hook uruchomi się **dopiero gdy zakładka jest zamontowana**:

```typescript
// Nowy komponent wewnątrz TeamContactsTab.tsx:
const StructureTab: React.FC<{ defaultView: 'list' | 'graph' }> = ({ defaultView }) => {
  const { tree, upline, statistics, settings, loading, error } = useOrganizationTree();
  const [viewMode, setViewMode] = useState<'list' | 'graph'>(defaultView);
  
  if (loading) return <Loader2 />;
  if (error) return <p>{error}</p>;
  if (!tree) return <p>Brak danych struktury</p>;
  
  return (
    // OrganizationChart / OrganizationList
  );
};
```

I w `TabsContent value="structure"`:
```typescript
{canAccessTree() && (
  <TabsContent value="structure">
    <StructureTab defaultView={treeSettings?.default_view || 'list'} />
  </TabsContent>
)}
```

## Podsumowanie zmian

| Plik | Zmiana | Efekt |
|---|---|---|
| `src/hooks/useOrganizationTree.ts` | Usunięcie `canAccessTree` i `getMaxDepthForRole` z deps `fetchTree` useCallback | Stabilna referencja `fetchTree` — brak pętli |
| `src/components/team-contacts/TeamContactsTab.tsx` | Zastąpienie `useOrganizationTree` przez `useOrganizationTreeSettings` + lazy `StructureTab` | Hook RPC uruchamia się tylko gdy zakładka jest aktywna; Pure-Kontakty nie crashuje |

## Dlaczego Pure-Kontakty też było dotknięte

`TeamContactsTab.tsx` renderuje się przy każdym wejściu do Pure-Kontakty. Wywołuje `useOrganizationTree()` z góry poziomu komponentu — co uruchamia pełny cykl fetchu z niestabilnymi referencjami. Zakładka "Struktura" nigdy nie musiała być aktywna — samo wejście w Pure-Kontakty wystarczyło, by wywołać hook i wprawić w ruch pętlę re-renderów.
