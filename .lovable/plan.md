
# Kompleksowa eliminacja pętli re-renderów — diagnoza i naprawa

## Dlaczego sebastiansnopek.eqology nie ma problemu?

Sebastian Snopek jest kontem z rolą **`admin`** (potwierdzono w bazie: eq_id `1234567890`, role: `admin`).

Istnieją trzy powody, dla których admin nie doświadcza crashu:

### Powód 1: Admin korzysta z Panelu Lidera, nie z Pure-Kontakty
Admin wchodzi do `/leader` gdzie `LeaderOrgTreeView` jest ładowany przez `React.lazy + Suspense`. Suspense całkowicie **izoluje** cykl życia komponentu — jeśli wystąpi błąd wewnątrz Suspense, React go łapie i wyświetla fallback, zamiast propagować go do góry drzewa.

### Powód 2: `canAccessTree()` zwraca `true` natychmiast dla admina
W `useOrganizationTreeSettings.ts`:
```typescript
if (userRoleStr === 'admin') return true;  // ← first branch, no settings check
```
Admin pomija całą logikę sprawdzania `settings.visible_to_*`. Dzięki temu `settings` może być nawet `null` i admin nadal przejdzie do fetchu. Mniej warunków = mniej przejść przez logikę, które mogą generować re-rendery.

### Powód 3: Admin nie wchodzi do Pure-Kontakty
`TeamContactsTab` — komponent który crashuje — renderuje się tylko gdy użytkownik wchodzi w "Pure-Kontakty". Admini zazwyczaj korzystają z Panelu Admina i Panelu Lidera. Partnerzy i specjaliści trafiają do Pure-Kontakty.

---

## Kompletna mapa pętli — 4 aktywne problemy

### Problem 1 (KRYTYCZNY): `settings` jako obiekt w `useCallback` dependencies

W `useOrganizationTree.ts`, linia 100:
```typescript
}, [profile?.eq_id, profile?.upline_eq_id, settingsLoading, settings]);
//                                                             ^^^^^^^^ ← OBIEKT
```

`settings` to obiekt React state. Każde wywołanie `setSettings(data)` tworzy **nową referencję obiektu**, nawet jeśli dane są identyczne. React porównuje obiekty przez referencję (`===`), więc `settings` zawsze zmienia się po każdym fetchu ustawień — co powoduje, że `fetchTree` dostaje nową referencję.

Ale `hasFetchedRef.current = true` powinno to blokować... **ale nie blokuje**, ponieważ przy Suspense + lazy loading komponent `StructureTab` odmontowuje się i montuje ponownie, co resetuje `hasFetchedRef` do `false`. Pełny cykl:

```
StructureTab montuje się
    ↓
useOrganizationTree() uruchamia się — hasFetchedRef.current = false
    ↓
useEffect([settingsLoading, profile?.eq_id]) — settingsLoading=true, poczekaj
    ↓
useOrganizationTreeSettings fetchSettings() kończy → setSettings(nowy obiekt)
    ↓
fetchTree useCallback dostaje nową referencję (settings zmienił się)
    ↓
useEffect widzi settingsLoading=false, profile?.eq_id istnieje
    ↓
hasFetchedRef.current = true, fetchTree() uruchamia się
    ↓
fetchTree → setLoading(true) → setTreeData([...]) → setLoading(false)
    ↓
setLoading powoduje re-render StructureTab
    ↓
useOrganizationTree re-renderuje się, settings = ten sam obiekt (stabilny już)
    ↓
OK — jeden fetch, jeden re-render. Brak pętli.
```

Dlaczego więc crash? Dlatego że **dwa niezależne wywołania** `useOrganizationTreeSettings()` istnieją jednocześnie:
- Jedno w `TeamContactsTab` (górny poziom)
- Drugie wewnątrz `StructureTab` → `useOrganizationTree()`

Obie instancje mają **osobny stan** (`settings`) i każda wywołuje `fetchSettings()` niezależnie. To podwójne fetchowanie + dwa osobne obiekty `settings` powoduje dodatkowe re-rendery.

### Problem 2 (KRYTYCZNY): `fetchSettings` nie jest stabilna — brak `useCallback`

W `useOrganizationTreeSettings.ts`, linia 68:
```typescript
const fetchSettings = async () => {  // ← nowa funkcja przy każdym renderze
  // ...
};
```

`fetchSettings` jest zwykłą funkcją deklarowaną wewnątrz komponentu — nie jest opakowana w `useCallback`. Przy każdym renderze hooka (który jest wywoływany zarówno w `TeamContactsTab` jak i w `useOrganizationTree`) `fetchSettings` dostaje nową referencję. To nie powoduje pętli bezpośrednio (bo `useEffect([], [])` jest pusty), ale eksportowana `refetch: fetchSettings` jest niestabilną referencją — jeśli ktokolwiek doda ją do zależności `useEffect`, będzie miał pętlę.

### Problem 3 (KRYTYCZNY): `specjalista` nie ma dostępu w bazie, ale `visible_to_specjalista = false`

Z bazy: `visible_to_specjalista: false`.

Czyli dla specjalisty `canAccessTree()` zwraca `false`. W `TeamContactsTab`:
```typescript
const hasTreeAccess = canAccessTree();  // ← false dla specjalisty
```

Zakładka "Struktura" nie jest wyświetlana. Ale `useOrganizationTreeSettings()` nadal jest wywołany na górze `TeamContactsTab`. Ten hook uruchamia `fetchSettings()` przy każdym wejściu do Pure-Kontakty — nawet gdy specjalista nie ma dostępu do drzewa. To jest nieefektywne, ale nie powinno crashować.

**Jednak** — `StructureTab` nie jest montowany dla specjalistów (bo `hasTreeAccess = false`), więc dla specjalisty problem leży gdzie indziej.

### Problem 4 (NOWY — RDZEŃ): `setLoading(false)` po `canAccessTree() === false` wyzwala re-render który destabilizuje cały hook

W `useOrganizationTree.ts`, linia 43-46:
```typescript
if (!canAccessTree()) {
  setLoading(false);  // ← setState wewnątrz fetchTree
  return;
}
```

Dla partnerów, którzy MAJ A dostęp (`visible_to_partners: true`), ta gałąź nie jest wyzwalana. Ale przez niestabilną referencję `settings` w `useCallback`, `fetchTree` może być recreowana wielokrotnie. Każde wywołanie `setLoading(false)` → re-render → useCallback widzi nowe `settings` → nowa `fetchTree` → useEffect (który jest `[settingsLoading, profile?.eq_id]`) **NIE uruchamia się ponownie** (bo te wartości się nie zmieniły), ALE `refetch: fetchTree` eksportuje niestabilną referencję.

---

## Prawdziwy korzeń dla partnerów

Dla partnerów (`visible_to_partners: true`):

1. `TeamContactsTab` montuje się
2. `useOrganizationTreeSettings()` → `fetchSettings()` → `setSettings(obiektA)`
3. `hasTreeAccess = canAccessTree()` = `true` → zakładka "Struktura" widoczna w tabs
4. Użytkownik klika "Struktura" → `StructureTab` montuje się
5. `useOrganizationTree()` → druga instancja `useOrganizationTreeSettings()` → druga instancja fetchSettings → `setSettings(obiektB)`
6. Dwie instancje `settings` → `canAccessTree()` w `fetchTree` korzysta z **domknięcia** z instancji nr 2
7. Fetch drzewa uruchamia się — `setLoading(true)` → `setTreeData(...)` → `setLoading(false)`
8. Re-render `StructureTab` — `useOrganizationTree` ponownie z tym samym `hasFetchedRef.current = true`
9. `useEffect([settingsLoading, profile?.eq_id])` nie uruchamia się ponownie — OK

**Ale co jeśli TOKEN_REFRESHED?**
- AuthContext wykrywa token refresh i wywołuje `setSession`
- `setUser` (z stabilizacją `prev?.id === newUser?.id` → zwraca `prev`)
- `profile` się nie zmienia (ten sam obiekt) → `profile?.eq_id` ta sama wartość
- `userRole` **może** dostać nowy obiekt mimo tego samego ID
- `userRoleStr = userRole?.role ?? null` — ta sama wartość string → stabilna
- `settings` — **ten sam obiekt** (nie było `setSettings` po TOKEN_REFRESHED)
- `settingsLoading` — `false` (nie zmienił się)

Więc po TOKEN_REFRESHED nie powinno być pętli... chyba że **SIGNED_IN** (powrót z tła na Androidzie) lub rzeczywisty re-mount komponentu.

**Rzeczywisty trigger crashu**: Mobilny Android/iOS po powrocie z tła wywołuje `SIGNED_IN` event, który resetuje profil i uruchamia `fetchProfile` ponownie. To powoduje:
- `profile` zmienia referencję (nowy obiekt)
- `profile?.eq_id` — ta sama wartość string → `useEffect` **NIE uruchamia się**
- JEDNAK `useOrganizationTreeSettings` nie ma zabezpieczenia i może fetchować ponownie jeśli komponent się odmontuje i zamontuje
- React Strict Mode (development) montuje każdy komponent dwa razy → podwójne wywołanie hooks → `hasFetchedRef.current = false` → dwa fetche → dwa `setLoading(true)` w szybkiej sekwencji

---

## Plan naprawy — 3 pliki

### Plik 1: `src/hooks/useOrganizationTreeSettings.ts`

**Zmiany:**

1. Opakować `fetchSettings` w `useCallback` z pustą tablicą zależności — stabilna referencja dla `refetch`
2. Dodać `hasFetchedRef` żeby zapobiec wielokrotnemu fetchowaniu przy wielu instancjach hooka
3. Zmienić `useEffect` żeby był odporny na re-mount

```typescript
// PRZED:
const fetchSettings = async () => { ... };
useEffect(() => { fetchSettings(); }, []);

// PO:
const hasFetchedRef = useRef(false);
const fetchSettings = useCallback(async () => {
  if (hasFetchedRef.current) return;  // Jeśli już trwa lub zakończyło się
  // ... reszta bez zmian
}, []);  // Puste deps — stabilna referencja
useEffect(() => { fetchSettings(); }, [fetchSettings]);
```

**Uwaga:** `hasFetchedRef` blokuje tylko pierwsze pobieranie. `refetch` (ręczne wywołanie) powinno resetować flagę i pobierać ponownie.

Lepsza wersja:

```typescript
const isFetchingRef = useRef(false);  // Blokuje równoległe wywołania (nie ponowne)
const fetchSettings = useCallback(async () => {
  if (isFetchingRef.current) return;
  isFetchingRef.current = true;
  try {
    setLoading(true);
    // ...fetch...
  } finally {
    isFetchingRef.current = false;
    setLoading(false);
  }
}, []);
```

4. Kluczowa zmiana: wyodrębnić `settingsId` jako stabilną wartość zamiast całego obiektu `settings` w `useCallback`:

```typescript
// Zamiast eksportować settings (niestabilny obiekt) jako zależność:
const settingsRef = useRef<OrganizationTreeSettings | null>(null);

// I w fetchSettings:
settingsRef.current = data;
setSettings(data);  // dla renderów UI

// canAccessTree i getMaxDepthForRole używają settingsRef.current zamiast settings z state:
const canAccessTree = useCallback((): boolean => {
  const s = settingsRef.current;
  if (!s || !s.is_enabled) return false;
  // ...
}, [userRoleStr]);  // Tylko userRoleStr — settings jest w ref, stabilny
```

To eliminuje główną przyczynę niestabilności `fetchTree` — `settings` znika z jego zależności.

### Plik 2: `src/hooks/useOrganizationTree.ts`

**Zmiany:**

1. Usunąć `settings` z zależności `fetchTree` — używać `settingsRef` (przekazanego z `useOrganizationTreeSettings`) lub po prostu wywołać funkcje wewnątrz bez ich jawnego deklarowania w deps:

```typescript
// Eksportować settingsRef z useOrganizationTreeSettings:
// Albo — prostsze rozwiązanie — usunąć settings z deps i wyizolować show_upline:

const showUpline = settings?.show_upline ?? true;  // stabilna prymitywna wartość
const showUplineRef = useRef(showUpline);
showUplineRef.current = showUpline;

const fetchTree = useCallback(async () => {
  if (settingsLoading) return;
  if (!profile?.eq_id) { setLoading(false); setError('...'); return; }
  if (!canAccessTree()) { setLoading(false); return; }
  
  try {
    setLoading(true);
    setError(null);
    const maxDepth = getMaxDepthForRole();
    // ...RPC...
    if (showUplineRef.current && profile.upline_eq_id) {
      // ...fetch upline...
    }
  } finally {
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [profile?.eq_id, profile?.upline_eq_id, settingsLoading]);
// settings, canAccessTree, getMaxDepthForRole — celowo pominięte
// canAccessTree i getMaxDepthForRole są teraz stabilne (deps: tylko userRoleStr)
// settings.show_upline jest w showUplineRef
```

2. Zabezpieczyć przed race condition z `isMountedRef`:

```typescript
const isMountedRef = useRef(true);
useEffect(() => {
  isMountedRef.current = true;
  return () => { isMountedRef.current = false; };
}, []);
```

I w `fetchTree` sprawdzać `if (!isMountedRef.current) return;` przed każdym `setState`.

3. Zresetować `hasFetchedRef` gdy `profile?.eq_id` się zmieni (zmiana konta):

```typescript
useEffect(() => {
  hasFetchedRef.current = false;
}, [profile?.eq_id]);
```

### Plik 3: `src/components/team-contacts/TeamContactsTab.tsx`

**Zmiana:** `useOrganizationTreeSettings` jest wywoływany dwa razy — raz w `TeamContactsTab`, raz wewnątrz `StructureTab → useOrganizationTree`. To podwójne fetchowanie jest nieefektywne.

Najprostsze rozwiązanie: przekazać `canAccessTree` i `treeSettings` do `StructureTab` jako props, żeby `StructureTab` nie potrzebował własnej instancji `useOrganizationTreeSettings`. W `useOrganizationTree` zmienić sygnaturę — zamiast wewnętrznie wywoływać `useOrganizationTreeSettings`, przyjąć je jako parametr opcjonalny:

Albo — jeszcze prostsze — przekazać `settings` z `TeamContactsTab` do `StructureTab` i wewnątrz `StructureTab` wywołać `useOrganizationTree()` który dostanie już załadowane settings z zewnątrz.

Ale to wymaga większej refaktoryzacji. Minimalnie bezpieczna zmiana:

Wywołanie `canAccessTree()` w linii 271 zamiast obliczać je ponownie przy każdym renderze — już jest zapisane w `hasTreeAccess` const. To jest OK. Ale:

```typescript
// PROBLEM: useOrganizationTreeSettings jest wywoływane DWIE RAZY:
// 1. w TeamContactsTab (linia 140)
// 2. wewnątrz useOrganizationTree (który jest wywołany przez StructureTab)
// Obie instancje fetchują settings niezależnie
```

Rozwiązanie: `useOrganizationTree` powinien przyjmować `settings` z zewnątrz zamiast wywoływać `useOrganizationTreeSettings` wewnętrznie. LUB — `useOrganizationTreeSettings` powinien cachować wynik przez React Query (`useQuery`) zamiast lokalnego stanu, co automatycznie deduplikuje requesty.

**Wybieramy React Query** dla `useOrganizationTreeSettings` — to eliminuje problem podwójnego fetchu całkowicie.

---

## Podsumowanie wszystkich zmian

| Plik | Zmiana | Eliminuje |
|---|---|---|
| `src/hooks/useOrganizationTreeSettings.ts` | `fetchSettings` → `useCallback([])` + `isFetchingRef` + `settingsRef` dla stabilnych deps | Problem 2 (niestabilna fetchSettings) + Problem 1 (settings jako obiekt w deps) |
| `src/hooks/useOrganizationTreeSettings.ts` | `canAccessTree` deps: tylko `[userRoleStr]` (settingsRef zamiast settings state) | Problem 1 (pętla przez settings) |
| `src/hooks/useOrganizationTree.ts` | `showUplineRef` zamiast `settings` w useCallback deps + `isMountedRef` + reset `hasFetchedRef` przy zmianie eq_id | Problem 3 (setLoading race condition) |
| `src/hooks/useOrganizationTree.ts` | Usunąć `settings` z useCallback deps — puste lub tylko `[settingsLoading, profile?.eq_id, profile?.upline_eq_id]` | Problem 1 (główna pętla) |
| `src/components/team-contacts/TeamContactsTab.tsx` | Przekazać `settings` z `TeamContactsTab` do `StructureTab` → `useOrganizationTree` nie woła `useOrganizationTreeSettings` | Problem 4 (podwójny fetch settings) |

## Dlaczego te zmiany są wystarczające

Po naprawie:
- `settings` nigdy nie jest w tablicy zależności `useCallback` — zamiast tego jest w `settingsRef` (mutable ref)
- `canAccessTree` i `getMaxDepthForRole` zależą tylko od `userRoleStr` — stabilnego prymitywu
- `fetchTree` zależy tylko od `[settingsLoading, profile?.eq_id, profile?.upline_eq_id]` — stabilnych prymitywów
- `hasFetchedRef` resetuje się tylko gdy `profile?.eq_id` się zmienia (zmiana konta)
- `isMountedRef` chroni przed setState na odmontowanym komponencie
- `isFetchingRef` zapobiega równoległym fetchom settings

Dla Sebastiana Snopka (admin) — nadal nie będzie żadnych problemów, bo kod jest kompatybilny wstecz.
