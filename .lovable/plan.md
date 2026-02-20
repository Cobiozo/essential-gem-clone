
# Diagnoza: Dlaczego Dawid Kowalczyk nie widzi struktury (a Sebastian Snopek widzi)

## Dane z bazy — wszystko jest w porządku po stronie danych

- Dawid Kowalczyk: `eq_id=121118185`, `role=partner`, `is_active=true`, `admin_approved=true`
- `get_organization_tree('121118185', 10)` zwraca **511 osób** — baza działa poprawnie
- `organization_tree_settings`: `visible_to_partners=true`, `partner_max_depth=10` — dostęp jest przyznany

Problem jest **wyłącznie w kodzie JavaScript** — konkretnie w `useOrganizationTree.ts`.

---

## Korzeń problemu: Race condition w `canAccessTree()`

### Jak działa `useOrganizationTree` z `externalSettings`:

```
TeamContactsTab montuje się
    ↓
useOrganizationTreeSettings() wywoływany → isFetchingRef=false → fetchSettings() startuje (async)
    ↓
hasTreeAccess = canAccessTree() → settingsRef.current = null → zwraca FALSE
    ↓
UWAGA: settingsLoading = true w tym momencie → zakładka "Struktura" może nie być widoczna!
    ↓
fetchSettings() kończy → setSettings(data) → settingsRef.current = {visible_to_partners: true, ...}
    ↓
hasTreeAccess = canAccessTree() → teraz zwraca TRUE → zakładka "Struktura" pojawia się
    ↓
Użytkownik klika "Struktura" → StructureTab montuje się
    ↓
useOrganizationTree(treeSettings) wywołuje się
    ↓  
internalHook = useOrganizationTreeSettings() → NOWA instancja hooka!
    ↓
isFetchingRef = false (nowa instancja) → fetchSettings() startuje PONOWNIE (async)
    ↓
settingsLoading = externalSettings !== undefined ? false : internalHook.loading
    ↓
externalSettings = treeSettings (nie undefined) → settingsLoading = FALSE natychmiast
    ↓
useEffect([settingsLoading=false, profile?.eq_id='121118185']) uruchamia się NATYCHMIAST
    ↓
hasFetchedRef.current = false → fetchTree() wywołuje się
    ↓
canAccessTree() = internalHook.canAccessTree() → internalHook.settingsRef.current = null (jeszcze ładuje!)
    ↓
canAccessTree() zwraca FALSE → setLoading(false) → return
    ↓
Dawid widzi pustą strukturę. Fetch nigdy nie dotarł do bazy.
```

### Dlaczego Sebastian (admin) nie ma problemu w LeaderPanel?

`LeaderOrgTreeView` wywołuje `useOrganizationTree()` **bez** `externalSettings`:
```typescript
const { tree, upline, statistics, settings, loading, error } = useOrganizationTree();
// externalSettings = undefined → settingsLoading = internalHook.loading
```

Przy `externalSettings = undefined`:
- `settingsLoading = internalHook.loading` = `true` na początku
- `useEffect([settingsLoading, profile?.eq_id])` nie uruchamia się dopóki `settingsLoading = true`
- Po zakończeniu `fetchSettings()`: `settingsLoading = false`, `settingsRef.current` ma dane
- `canAccessTree()` zwraca `true` → fetch drzewa działa

**Dawid korzysta z `TeamContactsTab` (Pure-Kontakty)** → `StructureTab` dostaje `externalSettings` → `settingsLoading = false` natychmiast → `canAccessTree()` czyta z pustego `settingsRef` nowej instancji → zwraca `false`.

### Dodatkowy problem: `internalHook` jest zawsze wywoływany

W `useOrganizationTree.ts` linia 26:
```typescript
const internalHook = useOrganizationTreeSettings();  // zawsze wywoływany!
```

Nawet gdy przekazano `externalSettings`, tworzona jest **nowa instancja** `useOrganizationTreeSettings`. Ta nowa instancja ma własny `settingsRef.current = null` i własne `isFetchingRef`. Hook zaczyna asynchronicznie fetchować settings, ale `canAccessTree` z tej nowej instancji jest używana przez `fetchTree` — i w momencie wywołania `fetchTree` (który jest natychmiastowy bo `settingsLoading=false`) `settingsRef.current` tej nowej instancji jest `null`.

---

## Plan naprawy — 2 pliki

### Plik 1: `src/hooks/useOrganizationTree.ts`

**Problem:** Gdy `externalSettings` są podane, hook nadal tworzy nową instancję `useOrganizationTreeSettings()` i używa jej `canAccessTree`/`getMaxDepthForRole` — które w momencie pierwszego wywołania mają `settingsRef.current = null`.

**Rozwiązanie:** Gdy `externalSettings` są przekazane z zewnątrz, NIE używać `canAccessTree` i `getMaxDepthForRole` z nowej instancji `internalHook`. Zamiast tego sprawdzić uprawnienia bezpośrednio na podstawie `externalSettings` + rola użytkownika.

Zmiana architektury:
- Jeśli `externalSettings` jest przekazane → `settingsLoading = false`, a `canAccess` i `maxDepth` obliczane są synchronicznie z `externalSettings` + `profile.role` — bez żadnego async
- Jeśli `externalSettings` nie jest przekazane → używamy całego `internalHook` jak dotychczas (LeaderPanel działa bez zmian)

```typescript
export const useOrganizationTree = (externalSettings?: OrganizationTreeSettings | null) => {
  const { profile, userRole } = useAuth();
  const userRoleStr = userRole?.role ?? null;
  
  // Wywołujemy internalHook warunkowo — tylko gdy externalSettings = undefined
  // ALE React nie pozwala na warunkowe wywołanie hooków!
  // Rozwiązanie: zawsze wywołujemy internalHook, ale ignorujemy jego wyniki gdy externalSettings podane
  const internalHook = useOrganizationTreeSettings();
  
  const settings = externalSettings !== undefined ? externalSettings : internalHook.settings;
  const settingsLoading = externalSettings !== undefined ? false : internalHook.loading;
  
  // KLUCZOWA ZMIANA: canAccessTree i getMaxDepthForRole MUSZĄ używać externalSettings
  // gdy są dostępne — nie nowej instancji internalHook która ma pustą settingsRef
  const canAccessTree = useCallback((): boolean => {
    const s = externalSettings !== undefined ? externalSettings : internalHook.settingsRef?.current;
    if (!s || !s.is_enabled) return false;
    if (!userRoleStr) return false;
    if (userRoleStr === 'admin') return true;
    if (userRoleStr === 'partner' && s.visible_to_partners) return true;
    if (userRoleStr === 'specjalista' && s.visible_to_specjalista) return true;
    if (userRoleStr === 'client' && s.visible_to_clients) return true;
    return false;
  }, [externalSettings, userRoleStr, internalHook.canAccessTree]);
  
  const getMaxDepthForRole = useCallback((): number => {
    const s = externalSettings !== undefined ? externalSettings : internalHook.settingsRef?.current;
    if (!s || !userRoleStr) return 0;
    if (userRoleStr === 'admin') return s.max_depth;
    if (userRoleStr === 'partner') return s.partner_max_depth;
    if (userRoleStr === 'specjalista') return s.specjalista_max_depth;
    if (userRoleStr === 'client') return s.client_max_depth;
    return 0;
  }, [externalSettings, userRoleStr]);
```

**Problem z eksportem `settingsRef` z `useOrganizationTreeSettings`:** Nie jest eksportowany. 

**Lepsze, prostsze rozwiązanie:** Wyeksportować z `useOrganizationTreeSettings` gotowe funkcje `canAccessTree` i `getMaxDepthForRole` które działają na `settingsRef` (już jest), a w `useOrganizationTree` zaimplementować własne lokalne wersje tych funkcji oparte bezpośrednio na `settings` (już załadowanym `externalSettings`):

```typescript
export const useOrganizationTree = (externalSettings?: OrganizationTreeSettings | null) => {
  const { profile, userRole } = useAuth();
  const userRoleStr = userRole?.role ?? null;
  const internalHook = useOrganizationTreeSettings();

  // Efektywne settings — externalSettings ma priorytet
  const settings = externalSettings !== undefined ? externalSettings : internalHook.settings;
  const settingsLoading = externalSettings !== undefined ? false : internalHook.loading;

  // NAPRAWIONE: canAccessTree używa settings (już załadowanego externalSettings LUB internalHook.canAccessTree)
  // Gdy externalSettings podane → sprawdzamy bezpośrednio na obiekcie (synchronicznie, bez ref)
  // Gdy nie podane → używamy internalHook.canAccessTree (która czyta z settingsRef)
  const canAccessTree = externalSettings !== undefined
    ? useCallback((): boolean => {
        const s = externalSettings;
        if (!s || !s.is_enabled) return false;
        if (!userRoleStr) return false;
        if (userRoleStr === 'admin') return true;
        if (userRoleStr === 'partner' && s.visible_to_partners) return true;
        if (userRoleStr === 'specjalista' && s.visible_to_specjalista) return true;
        if (userRoleStr === 'client' && s.visible_to_clients) return true;
        return false;
      }, [externalSettings, userRoleStr])
    : internalHook.canAccessTree;
```

**Problem:** React nie pozwala na warunkowe wywołanie `useCallback`.

**Ostateczne, poprawne rozwiązanie:** Zawsze definiować lokalne `canAccessTree` i `getMaxDepthForRole` jako stabilne funkcje, które sprawdzają `externalSettings` gdy dostępne, lub delegują do `internalHook` gdy nie:

```typescript
const resolvedCanAccessTree = useCallback((): boolean => {
  if (externalSettings !== undefined) {
    // externalSettings są gotowe synchronicznie — używamy ich wprost
    const s = externalSettings;
    if (!s || !s.is_enabled) return false;
    if (!userRoleStr) return false;
    if (userRoleStr === 'admin') return true;
    if (userRoleStr === 'partner' && s.visible_to_partners) return true;
    if (userRoleStr === 'specjalista' && s.visible_to_specjalista) return true;
    if (userRoleStr === 'client' && s.visible_to_clients) return true;
    return false;
  }
  // Brak externalSettings — deleguj do internalHook (czyta z settingsRef)
  return internalHook.canAccessTree();
}, [externalSettings, userRoleStr, internalHook.canAccessTree]);

const resolvedGetMaxDepthForRole = useCallback((): number => {
  if (externalSettings !== undefined) {
    const s = externalSettings;
    if (!s || !userRoleStr) return 0;
    if (userRoleStr === 'admin') return s.max_depth;
    if (userRoleStr === 'partner') return s.partner_max_depth;
    if (userRoleStr === 'specjalista') return s.specjalista_max_depth;
    if (userRoleStr === 'client') return s.client_max_depth;
    return 0;
  }
  return internalHook.getMaxDepthForRole();
}, [externalSettings, userRoleStr, internalHook.getMaxDepthForRole]);
```

Ale `internalHook.canAccessTree` w deps może destabilizować. Ponieważ `internalHook.canAccessTree` jest już stabilna (zależy tylko od `userRoleStr`), to `resolvedCanAccessTree` też będzie stabilna.

**Kluczowe deps `fetchTree` muszą pozostać stabilne:** `[profile?.eq_id, profile?.upline_eq_id, settingsLoading]` — bez `resolvedCanAccessTree` w deps, używając zamiast tego `resolvedCanAccessTreeRef`:

```typescript
const resolvedCanAccessTreeRef = useRef(resolvedCanAccessTree);
resolvedCanAccessTreeRef.current = resolvedCanAccessTree;

const resolvedGetMaxDepthRef = useRef(resolvedGetMaxDepthForRole);
resolvedGetMaxDepthRef.current = resolvedGetMaxDepthForRole;

const fetchTree = useCallback(async () => {
  if (settingsLoading) return;
  if (!profile?.eq_id) { ... }
  if (!resolvedCanAccessTreeRef.current()) { setLoading(false); return; }
  
  const maxDepth = resolvedGetMaxDepthRef.current();
  // ...
}, [profile?.eq_id, profile?.upline_eq_id, settingsLoading]);
```

### Plik 2: `src/components/team-contacts/TeamContactsTab.tsx`

Plik nie wymaga zmian — po naprawieniu hooka `StructureTab` otrzymujący `treeSettings` będzie działał poprawnie. `treeSettings` przekazane jako `externalSettings` będzie używane synchronicznie do sprawdzenia uprawnień.

---

## Dlaczego ta naprawa działa dla wszystkich ról

| Użytkownik | Rola | Wcześniej | Po naprawie |
|---|---|---|---|
| Sebastian Snopek | admin | OK (LeaderPanel, externalSettings=undefined) | OK — bez zmian |
| Dawid Kowalczyk | partner | Pusta struktura (race condition na settingsRef) | Poprawne — externalSettings czytane synchronicznie |
| Inni partnerzy | partner | Pusta struktura | Poprawne |
| Specjaliści | specjalista | Brak dostępu (visible_to_specjalista=false w bazie) | Brak dostępu (poprawnie) |

## Podsumowanie

- **1 plik do zmiany:** `src/hooks/useOrganizationTree.ts`
- **Mechanizm naprawy:** Zastąpienie `internalHook.canAccessTree` i `internalHook.getMaxDepthForRole` lokalnymi funkcjami `resolvedCanAccessTree` / `resolvedGetMaxDepthForRole`, które czytają `externalSettings` synchronicznie gdy dostępne
- **Stabilność:** Obie funkcje przechowywane w ref — nie wchodzą do deps `fetchTree`
- **Brak regresji dla LeaderPanel:** Gdy `externalSettings = undefined`, logika deleguje do `internalHook` (tak jak dotychczas)
