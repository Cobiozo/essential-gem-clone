
# Ulepszenie struktury organizacji - kompaktowy design i interakcje

## Wymagane zmiany

### 1. Kompaktowy design kafelków (OrganizationNode)
**Problem**: Za dużo zmarnowanej przestrzeni wokół avatara i danych.

**Rozwiązanie - nowy układ inspirowany referencją**:
```text
┌─────────────────────────────────────┐
│  [SS]  Sebastian Snopek             │
│        [Partner]                    │
│        EQID: 121118999              │
│        📧 email@example.com         │
│        📞 +48 506145844             │
├─────────────────────────────────────┤
│            👥 +4                    │
└─────────────────────────────────────┘
```

- Zmniejszenie paddingu: `p-2` zamiast `p-3/p-4/p-5`
- Mniejszy avatar inline z imieniem: `w-8 h-8`
- Zmiana "ID:" na "EQID:"
- Zredukowana szerokość: `min-w-[160px]` zamiast `min-w-[200-280px]`
- Dane w jednej zwartej kolumnie

### 2. Auto-fit zoom do ilości użytkowników
**Problem**: Przy 100% nie widać wszystkiego.

**Rozwiązanie**:
- Obliczanie początkowego zoom na podstawie liczby dzieci pierwszego poziomu
- Formuła: `initialZoom = Math.min(100, Math.floor(viewportWidth / (childCount * nodeWidth)))`
- Usunięcie dolnego limitu 50% - umożliwienie pomniejszenia do 30%

### 3. Pan/Drag (chwyć i przesuń)
**Implementacja**:
- State: `isDragging`, `dragStart`, `scrollPosition`
- Obsługa `onMouseDown`, `onMouseMove`, `onMouseUp`
- Styl kursora: `cursor-grab` / `cursor-grabbing`
- Przesuwanie kontenera za pomocą `scrollLeft`/`scrollTop`

### 4. Lepsze linie łączące
**Problem**: Linie są za mało widoczne (obecnie `bg-border` i `w-0.5`).

**Rozwiązanie**:
- Grubsze linie: `w-1` (4px) zamiast `w-0.5` (2px)
- Bardziej widoczny kolor: `bg-border/80` lub dedykowany kolor
- Zaokrąglone zakończenia linii

### 5. Podświetlanie ścieżki przy kliknięciu
**Nowa funkcjonalność**:
- State: `selectedNodeId` i `highlightedPath: string[]`
- Kliknięcie w węzeł → obliczenie ścieżki od roota do wybranego węzła
- Linie na ścieżce: grubsze (`w-1.5`) i kolorowe (`bg-primary`)
- Węzły na ścieżce: normalna skala
- Pozostałe węzły: `scale-90 opacity-60` (zmniejszone i przyciemnione)

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/team-contacts/organization/OrganizationNode.tsx` | Kompaktowy layout, zmiana "ID" na "EQID" |
| `src/components/team-contacts/organization/OrganizationChart.tsx` | Auto-fit zoom, drag/pan, podświetlanie ścieżki, grubsze linie |

---

## Szczegóły techniczne

### OrganizationNode.tsx - Kompaktowy design

**Nowa konfiguracja rozmiarów**:
```typescript
const sizeConfig = {
  small: {
    container: 'min-w-[140px] max-w-[180px] p-2',
    avatar: 'w-7 h-7',
    text: 'text-[10px]',
    nameText: 'text-xs',
    badge: 'text-[9px] px-1 py-0',
    infoText: 'text-[9px]',
  },
  medium: {
    container: 'min-w-[160px] max-w-[200px] p-2.5',
    avatar: 'w-8 h-8',
    text: 'text-xs',
    nameText: 'text-sm',
    badge: 'text-[10px] px-1.5 py-0.5',
    infoText: 'text-[10px]',
  },
  large: {
    container: 'min-w-[180px] max-w-[220px] p-3',
    avatar: 'w-9 h-9',
    text: 'text-sm',
    nameText: 'text-base',
    badge: 'text-xs px-2 py-0.5',
    infoText: 'text-xs',
  },
};
```

**Zmiana etykiety**:
```typescript
// Linia 174 - zmiana "ID:" na "EQID:"
EQID: {node.eq_id}
```

### OrganizationChart.tsx - Główne zmiany

**1. State dla ścieżki i drag**:
```typescript
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
const [isDragging, setIsDragging] = useState(false);
const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
const scrollContainerRef = useRef<HTMLDivElement>(null);
```

**2. Funkcja znajdowania ścieżki**:
```typescript
const findPathToNode = (root: OrganizationTreeNode, targetId: string, path: string[] = []): string[] | null => {
  const currentPath = [...path, root.id];
  if (root.id === targetId) return currentPath;
  for (const child of root.children) {
    const result = findPathToNode(child, targetId, currentPath);
    if (result) return result;
  }
  return null;
};
```

**3. Obsługa kliknięcia węzła**:
```typescript
const handleNodeClick = (nodeId: string) => {
  if (selectedNodeId === nodeId) {
    setSelectedNodeId(null);
    setHighlightedPath([]);
  } else {
    setSelectedNodeId(nodeId);
    const path = findPathToNode(tree, nodeId);
    setHighlightedPath(path || []);
  }
};
```

**4. Drag handlers**:
```typescript
const handleMouseDown = (e: React.MouseEvent) => {
  if (!scrollContainerRef.current) return;
  setIsDragging(true);
  setDragStart({
    x: e.clientX + scrollContainerRef.current.scrollLeft,
    y: e.clientY + scrollContainerRef.current.scrollTop,
  });
};

const handleMouseMove = (e: React.MouseEvent) => {
  if (!isDragging || !scrollContainerRef.current) return;
  scrollContainerRef.current.scrollLeft = dragStart.x - e.clientX;
  scrollContainerRef.current.scrollTop = dragStart.y - e.clientY;
};

const handleMouseUp = () => setIsDragging(false);
```

**5. Auto-fit zoom przy montowaniu**:
```typescript
useEffect(() => {
  if (tree && tree.children.length > 0) {
    const childCount = tree.children.length;
    const estimatedWidth = childCount * 180 + (childCount - 1) * 16;
    const viewportWidth = window.innerWidth - 100;
    const autoZoom = Math.min(100, Math.floor((viewportWidth / estimatedWidth) * 100));
    setZoom(Math.max(30, autoZoom)); // Minimum 30%
  }
}, [tree]);
```

**6. Przekazanie props do TreeBranch**:
```typescript
<TreeBranch
  node={tree}
  settings={settings}
  level={0}
  isRoot
  highlightedPath={highlightedPath}
  selectedNodeId={selectedNodeId}
  onNodeClick={handleNodeClick}
/>
```

**7. TreeBranch - obsługa podświetlania**:
```typescript
const isOnPath = highlightedPath.includes(node.id);
const isSelected = selectedNodeId === node.id;
const hasFocus = highlightedPath.length > 0;

// Na węźle:
<div className={cn(
  'transition-all duration-300',
  hasFocus && !isOnPath && 'scale-90 opacity-50',
  isSelected && 'ring-2 ring-primary ring-offset-2'
)}>

// Na liniach:
<div className={cn(
  'absolute left-1/2 -top-6 h-6 transition-all duration-300',
  isOnPath ? 'w-1 bg-primary' : 'w-0.5 bg-border'
)} />
```

---

## Oczekiwany rezultat

1. **Kompaktowe kafelki** - mniej pustej przestrzeni, czytelne dane
2. **"EQID:"** zamiast "ID:"
3. **Auto-zoom** - widok dopasowuje się do ilości pierwszego poziomu
4. **Drag & Pan** - możliwość przeciągania drzewa myszką
5. **Widoczne linie** - grubsze, lepiej kontrastujące
6. **Podświetlanie ścieżki** - kliknięcie w użytkownika wyróżnia całą linię od roota

