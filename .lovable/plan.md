
# Analiza: Czy zatwierdzony plan naprawi problem bez skutków ubocznych?

## Co jest w kodzie TERAZ (po poprzednich zmianach)

### `useOrganizationTree.ts` — aktualny stan

Hook jest już zaktualizowany z `resolvedCanAccessTree` i `resolvedCanAccessTreeRef`. Logika wygląda poprawnie:

```
externalSettings przekazane → resolvedCanAccessTree sprawdza synchronicznie
externalSettings brak → deleguje do internalHook.canAccessTree()
```

Jednak **problem pozostał** z innego powodu.

### `TeamContactsTab.tsx` linia 645 — GŁÓWNA PRZYCZYNA

```typescript
{hasTreeAccess && treeSettings && (    // ← treeSettings musi być != null
  <TabsContent value="structure">
    <StructureTab treeSettings={treeSettings} ... />
  </TabsContent>
)}
```

**Sekwencja:**
1. `TeamContactsTab` montuje się
2. `treeSettings = null` (async fetch w toku), `hasTreeAccess = false` (settingsRef = null)
3. `TabsContent value="structure"` NIE istnieje w DOM
4. `fetchSettings()` kończy → `treeSettings = {...}`, `hasTreeAccess = true` (re-render)
5. `TabsContent value="structure"` pojawia się w DOM
6. `StructureTab` montuje się → `useOrganizationTree(treeSettings)` działa
7. `resolvedCanAccessTree()` sprawdza `externalSettings` synchronicznie → **zwraca true**
8. `fetchTree()` wywołuje RPC → dane przychodzą → `setTreeData([...511 osób...])`
9. `buildTree()` → `tree` = korzeń z dziećmi

**To powinno działać.** Dlaczego Dawid nie widzi?

### `StructureTab` linia 121 — BRAKUJĄCY SZCZEGÓŁ

```typescript
<OrganizationChart
  tree={tree}
  upline={upline}
  settings={treeSettings}    // ← treeSettings z PROPA (externalSettings)
  statistics={statistics}
/>
```

`OrganizationChart` i `OrganizationList` otrzymują `treeSettings` z propa — to jest poprawne. `tree` pochodzi z hooka — ale czy jest poprawnie zbudowany?

### Możliwy problem w `buildTree` — kiedy `upline_eq_id` partnera nie ma w mapie

Dla partnera Dawida (`eq_id=121118185`):
- Jego `upline_eq_id` wskazuje na kogoś wyżej w strukturze
- `get_organization_tree` zwraca tylko downline (od Dawida w dół)
- Gdy `buildTree` przetwarza dane, szuka `member.upline_eq_id` w `nodeMap`
- Dla Dawida (level=0): `root = node` — OK
- Dla jego bezpośrednich podwładnych (level=1): `upline_eq_id = Dawid's eq_id` → jest w mapie → działa

Więc `buildTree` powinien działać poprawnie.

### Rzeczywisty problem — `isFetchingRef` blokuje drugą instancję hooka

```typescript
// useOrganizationTreeSettings.ts linia 73-74:
const fetchSettings = useCallback(async (force = false) => {
  if (isFetchingRef.current && !force) return;  // ← blokada
  isFetchingRef.current = true;
```

**Ale `isFetchingRef` jest per-instancja hooka!** Każda instancja `useOrganizationTreeSettings()` ma swój własny `isFetchingRef`. Nie ma konfliktu między instancjami.

Jednak **`settingsLoading` w `useOrganizationTree` linia 32**:
```typescript
const settingsLoading = externalSettings !== undefined ? false : internalHook.loading;
```

Gdy `externalSettings` jest podany, `settingsLoading = false` **natychmiast**. `useEffect([settingsLoading=false, profile?.eq_id])` uruchamia się **synchronicznie przy pierwszym renderze**. `hasFetchedRef.current = false` → ustawia `true` → `fetchTree()` wywołane.

**PROBLEM JEST TUTAJ:** `fetchTree` w `useCallback` zamknął `settingsLoading` = `false` przez binding przy pierwszym renderze. Ale główne wywołanie:

```typescript
const fetchTree = useCallback(async () => {
  if (settingsLoading) return;  // settingsLoading = false → nie blokuje
```

To jest OK. Ale sprawdzamy `resolvedCanAccessTreeRef.current()` — wywoływane od razu gdy `StructureTab` się montuje z `treeSettings` (które są już załadowane od rodzica).

**Wniosek: logika hooka jest teraz poprawna.** Problem może leżeć gdzie indziej.

### Sprawdzenie: co widzi partner "widzi tylko członków zespołu"

"Widzi tylko członków zespołu" = widzi zakładkę "Członkowie zespołu" ale nie widzi struktury w formie list/grafu. To znaczy:

**Opcja A:** Zakładka "Struktura" jest widoczna (klika i wchodzi) ale zawartość jest pusta (tree=null lub loading)

**Opcja B:** Zakładka "Struktura" w ogóle się nie pojawia

Biorąc pod uwagę że w bazie `visible_to_partners=true` i `treeSettings` ładuje się z bazy → zakładka powinna się pojawić.

**Najbardziej prawdopodobny scenariusz:**

Użytkownik wchodzi na stronę → widzi zakładki → klika "Struktura" → **ZANIM** `treeSettings` się załaduje. W tym momencie `activeTab = 'structure'` ale `TabsContent value="structure"` jeszcze nie istnieje (bo `treeSettings && hasTreeAccess = false`). Gdy `treeSettings` się załaduje i `TabsContent` pojawi się — Radix UI Tabs **nie automatycznie wyświetla zawartości** dla aktywnej zakładki jeśli `TabsContent` był dodany po zmianie `value`.

**To jest rzeczywisty problem UI.** `activeTab = 'structure'` ale DOM nie miał `TabsContent` w momencie ustawienia — treść nie jest wyświetlana.

## Co plan proponuje zmienić

Plan zakłada:
1. Usunięcie struktury z `LeaderPanel.tsx` (zakładka "Moja struktura")
2. Zmianę `StructureTab` aby używał `useOrganizationTree()` **bez** `externalSettings`

### Czy zmiana nr 2 naprawi problem?

**TAK** — z konkretnego powodu:

Gdy `StructureTab` używa `useOrganizationTree()` bez parametru:
- `settingsLoading = internalHook.loading` = **true** na początku
- `useEffect([settingsLoading=true, ...])` → `!settingsLoading` = false → **fetchTree NIE uruchamia się**
- `TabsContent` jest renderowany zawsze (bez warunku `&& treeSettings`)
- `StructureTab` montuje się od razu (nie czeka na `treeSettings` rodzica)
- Gdy `internalHook.fetchSettings()` zakończy → `settingsLoading = false` → useEffect odpala → `fetchTree()` działa

### Czy usunięcie warunku `&& treeSettings` z `TabsContent` jest bezpieczne?

Tak, ponieważ `StructureTab` będzie sam zarządzał loading state:
- Podczas ładowania: spinner
- Brak dostępu: brak contentu (hook nie pobierze danych)
- Dane dostępne: lista/graf

### Czy zmiana nr 1 (LeaderPanel) narusza coś?

**Nie.** Usunięcie zakładki "Moja struktura" z `LeaderPanel`:
- `LeaderOrgTreeView` przestaje być importowany (lazy) — brak wpływu na bundle
- `hasOrgTree` z `useLeaderPermissions` — flaga nadal istnieje w hooku, tylko przestaje być używana w tym komponencie
- Żaden inny komponent nie używa `LeaderOrgTreeView` bezpośrednio
- Partnerzy zobaczą strukturę w Pure-Kontakty (zakładka "Struktura")

## Ryzyko i gwarancje

| Element | Status | Ryzyko |
|---|---|---|
| `LeaderPanel` — inne zakładki (szkolenia, spotkania, kalkulatory, zatwierdzenia) | Niezmienione | Brak ryzyka |
| `TeamContactsTab` — zakładki prywatne/zespół/szukaj | Niezmienione | Brak ryzyka |
| `useOrganizationTreeSettings` | Niezmieniony | Brak ryzyka |
| `useOrganizationTree` | Niezmieniony | Brak ryzyka |
| `OrganizationChart` i `OrganizationList` | Niezmienione | Brak ryzyka |
| Struktura w Pure-Kontakty (partner) | Naprawiane | Ryzyko minimalne |

## Szczegóły implementacji

### Plik 1: `src/pages/LeaderPanel.tsx`

Usunąć:
- `const LeaderOrgTreeView = lazy(...)` — import
- `import { TreePine }` z lucide-react (jeśli tylko tam używany — sprawdzić)
- `hasOrgTree` z destructuringu `useLeaderPermissions()`
- Wiersz `...(hasOrgTree ? [{ id: 'org-tree', ... }] : [])` z `availableTabs`
- Blok `{hasOrgTree && <TabsContent value="org-tree">...}` w Tabs
- Blok `{hasOrgTree && <Suspense>...}` w single-tab fallback

**Uwaga:** `TreePine` jest importowany ale czy używany tylko dla `hasOrgTree`? Tak — tylko w zakładce org-tree. Można usunąć `TreePine` z importu.

### Plik 2: `src/components/team-contacts/TeamContactsTab.tsx`

Zmiany w `StructureTab` (linie 67-133):

```typescript
// PRZED:
const StructureTab: React.FC<{ defaultView: 'list' | 'graph'; treeSettings: OrganizationTreeSettings }> = ({ defaultView, treeSettings }) => {
  const { tree, upline, statistics, loading, error } = useOrganizationTree(treeSettings);
  // ...
  <OrganizationChart settings={treeSettings} ... />
  <OrganizationList settings={treeSettings} ... />

// PO:
const StructureTab: React.FC<{ defaultView?: 'list' | 'graph' }> = ({ defaultView = 'list' }) => {
  const { tree, upline, statistics, loading, error, settings } = useOrganizationTree();
  // ...
  {settings && (
    viewMode === 'graph' ? (
      <OrganizationChart tree={tree} upline={upline} settings={settings} statistics={statistics} />
    ) : (
      <OrganizationList tree={tree} upline={upline} settings={settings} statistics={statistics} />
    )
  )}
```

Zmiana renderowania `TabsContent` (linia 645):

```typescript
// PRZED:
{hasTreeAccess && treeSettings && (
  <TabsContent value="structure">
    <StructureTab defaultView={treeSettings.default_view || 'list'} treeSettings={treeSettings} />
  </TabsContent>
)}

// PO — StructureTab sam zarządza dostępem i default_view:
{hasTreeAccess && (
  <TabsContent value="structure">
    <StructureTab />
  </TabsContent>
)}
```

**Uwaga:** `hasTreeAccess` jest nadal potrzebne jako strażnik (sprawdza czy pokazać zakładkę w tabs). `treeSettings` z rodzica nie jest już przekazywane. `StructureTab` sam załaduje `settings` przez `useOrganizationTree()` → `internalHook.settings`.

`defaultView` staje się opcjonalne — `StructureTab` odczyta `settings.default_view` z hooka po załadowaniu, i ustawi `viewMode` przy inicjalizacji przez `useEffect`.

## Odpowiedź na pytanie użytkownika

**Tak, plan jest bezpieczny i poprawi działanie struktury** — bez naruszania:
- Panel Lidera (inne zakładki działają normalnie)
- Kontakty prywatne i zespołowe
- Wyszukiwarka specjalistów
- Zatwierdzeń liderskich
- Kalkulatorów

Kluczowa zmiana: `StructureTab` nie czeka na `treeSettings` od rodzica (które mogły być `null` gdy użytkownik klikał zakładkę) — sam zarządza swoim cyklem ładowania, co eliminuje race condition.
