
# Naprawa: brak pierwszej linii sponsorowania w InteractiveOrgChart

## Przyczyna błędu

W `buildRows` i logice stanu jest fundamentalna niespójność indeksowania:

**Obecny stan (błędny):**
```
selectedPath = [tree.id]   ← selectedPath[0] = ID roota

W pętli buildRows, level=0:
  currentNode = root
  selectedId = selectedPath[0] = root.id
  szuka root.id wśród root.children → NIE ZNAJDUJE → break
  → Row 1 (bezpośrednio poleceni) NIGDY nie zostaje wyrenderowana
```

**Oczekiwane zachowanie:**
- Wiersz 0: zawsze root
- Wiersz 1: zawsze dzieci roota (pierwsza linia sponsorowania) — bez klikania
- Wiersz 2+: dzieci wybranego węzła z wiersza 1 — po kliknięciu

## Plan naprawy — tylko 1 plik

### `src/components/team-contacts/organization/InteractiveOrgChart.tsx`

**Zmiana 1 — przebudowa `buildRows`:**

Nowe podejście: `selectedPath[N]` = ID wybranego węzła na poziomie N+1 (indeks 0 = który z dzieci roota jest wybrany). Root zawsze pokazuje swoje dzieci.

```typescript
// PRZED (błędne):
function buildRows(root, selectedPath) {
  rows.push({ nodes: [root], level: 0 });
  
  let currentNode = root;
  let level = 0;
  while (level < selectedPath.length) {
    const selectedId = selectedPath[level];
    const found = currentNode.children.find(c => c.id === selectedId);
    // level=0: szuka root.id wśród root.children → FAIL
    ...
  }
}

// PO (prawidłowe):
function buildRows(root, selectedPath) {
  rows.push({ nodes: [root], level: 0 });
  
  // Wiersz 1 (dzieci roota) — zawsze widoczny:
  if (root.children.length > 0) {
    rows.push({ nodes: root.children, parentId: root.id, level: 1 });
  }
  
  // Wiersz 2+ — tylko gdy coś wybrano z poziomu 1:
  let currentNode = root;
  for (let i = 0; i < selectedPath.length; i++) {
    const selectedId = selectedPath[i];
    if (!selectedId) break;
    
    const found = currentNode.children.find(c => c.id === selectedId);
    if (!found || found.children.length === 0) break;
    
    rows.push({ nodes: found.children, parentId: found.id, level: i + 2 });
    currentNode = found;
  }
}
```

**Zmiana 2 — przebudowa stanu `selectedPath`:**

```typescript
// PRZED:
const [selectedPath, setSelectedPath] = useState<(string | null)[]>(
  () => tree ? [tree.id] : []
);

// PO: selectedPath[0] = który z dzieci roota jest wybrany (null = żaden)
// selectedPath[1] = który z wnuków (dzieci wybranego dziecka) jest wybrany
// itd.
const [selectedPath, setSelectedPath] = useState<(string | null)[]>([]);

// Reset przy zmianie tree:
useEffect(() => {
  setSelectedPath([]);  // ← null, nie tree.id
}, [tree?.id]);
```

**Zmiana 3 — przebudowa `handleNodeClick`:**

```typescript
// PRZED (level był indeksem wiersza, row 0 = root, row 1 = dzieci)
const handleNodeClick = (node, level) => {
  setSelectedPath(prev => {
    const newPath = prev.slice(0, level + 1);
    newPath[level] = newPath[level] === node.id ? null : node.id;
    return newPath;
  });
};

// PO: level = indeks wiersza w rows[]
// Wiersz 1 = dzieci roota → selectedPath[0]
// Wiersz 2 = wnuki → selectedPath[1]
// Kliknięcie węzła w wierszu `rowIndex` → selectedPath[rowIndex - 1]
const handleNodeClick = (node, rowIndex) => {
  const pathIndex = rowIndex - 1;  // row 1 → selectedPath[0]
  setSelectedPath(prev => {
    const newPath = prev.slice(0, pathIndex + 1);
    newPath[pathIndex] = newPath[pathIndex] === node.id ? null : node.id;
    return newPath;
  });
};
```

**Zmiana 4 — przebudowa logiki stanów węzłów w JSX:**

```typescript
// Wiersz 0 (root): zawsze isRoot, nieinteraktywny
// Wiersz 1 (dzieci roota): 
//   - selectedPath[0] = null → wszystkie 'normal'
//   - selectedPath[0] = jakiś ID → ten 'active', reszta 'dimmed'
// Wiersz 2+: analogicznie, selectedPath[rowIndex - 1]

const pathIndex = rowIndex - 1;
const selectedInRow = pathIndex >= 0 && pathIndex < selectedPath.length
  ? selectedPath[pathIndex]
  : null;

let state: NodeState = 'normal';
if (!isRootRow) {
  if (selectedInRow === null) {
    state = 'normal';  // nic nie wybrano → wszystkie normal
  } else {
    state = node.id === selectedInRow ? 'active' : 'dimmed';
  }
}
```

**Zmiana 5 — naprawa łączników SVG:**

Dla wiersza 1 (dzieci roota) parent to zawsze root:
```typescript
// rowIndex=1 → parentNodeId = root.id, parentLevel = 0
// rowIndex=2 → parentNodeId = selectedPath[0], parentLevel = 1
// Ogólnie: parentNodeId = rowIndex === 1 ? root.id : selectedPath[rowIndex - 2]
```

## Podsumowanie zmian

| Aspekt | Przed (błąd) | Po (naprawione) |
|---|---|---|
| `selectedPath` init | `[tree.id]` | `[]` |
| Wiersz 1 widoczny? | Tylko gdy `selectedPath[0]` = child.id | Zawsze |
| Kliknięcie w row 1 | Ustawia `selectedPath[1]` | Ustawia `selectedPath[0]` |
| Łącznik do row 1 | Od `selectedPath[0]` (root.id) → błędnie | Od root.id → zawsze |

Tylko **1 plik**: `src/components/team-contacts/organization/InteractiveOrgChart.tsx`
