

# Naprawa podświetlania ścieżki i animacji rysowania linii

## Zidentyfikowane problemy

### Problem 1: Błędne podświetlanie linii
**Obecny kod (linia 147):**
```typescript
const isHighlighted = (isOnPath || childIsOnPath) && hasFocus;
```

**Błąd:** Podświetla linię gdy rodzic LUB dziecko jest na ścieżce. To powoduje, że gdy klikniesz "Sebastian Snopek (Klient)", podświetlają się WSZYSTKIE linie wychodzące od "Sebastian Snopek (Partner)" - bo rodzic jest na ścieżce.

**Poprawna logika:**
Linia między rodzicem a dzieckiem powinna być podświetlona TYLKO gdy OBA węzły są na ścieżce:
```typescript
const isHighlighted = isOnPath && childIsOnPath && hasFocus;
```

### Problem 2: Brak animacji rysowania przy kliknięciu
**Obecny stan:**
- Animacja CSS `draw-connector` działa tylko przy pierwszym renderze
- Przy kliknięciu w węzeł nie ma efektu płynnego rysowania podświetlonej linii

**Rozwiązanie:**
Dodanie unikalnego klucza (`key`) z `animationKey` do elementu `<path>` aby wymusić ponowne uruchomienie animacji CSS przy zmianie podświetlenia.

---

## Szczegóły implementacji

### Plik: `OrganizationChart.tsx`

**Zmiana 1: Poprawienie logiki podświetlania (linia 147)**

```typescript
// PRZED:
const isHighlighted = (isOnPath || childIsOnPath) && hasFocus;

// PO:
const isHighlighted = isOnPath && childIsOnPath && hasFocus;
```

**Zmiana 2: Dodanie animationKey do wymuszenia animacji**

Dodanie stanu do śledzenia kiedy podświetlenie się zmienia:
```typescript
// W komponencie OrganizationChart - dodać stan:
const [animationKey, setAnimationKey] = useState(0);

// W handleNodeClick:
const handleNodeClick = useCallback((nodeId: string) => {
  if (!tree) return;
  
  if (selectedNodeId === nodeId) {
    setSelectedNodeId(null);
    setHighlightedPath([]);
  } else {
    setSelectedNodeId(nodeId);
    const path = findPathToNode(tree, nodeId);
    setHighlightedPath(path || []);
    setAnimationKey(prev => prev + 1); // Wymusza ponowną animację
  }
}, [tree, selectedNodeId]);
```

Przekazanie `animationKey` do `TreeBranch`:
```typescript
<TreeBranch
  node={tree}
  settings={settings}
  level={0}
  isRoot
  highlightedPath={highlightedPath}
  selectedNodeId={selectedNodeId}
  onNodeClick={handleNodeClick}
  animationKey={animationKey}
/>
```

**Zmiana 3: Użycie animationKey w path key**

W TreeBranch dla każdego `<path>`:
```tsx
<path
  key={`${child.id}-${isHighlighted ? animationKey : 'static'}`}
  d={createCurvePath(centerX, 0, childX, 48, 14)}
  className={cn(
    "fill-none transition-colors",
    isHighlighted 
      ? "stroke-primary tree-connector-highlight" 
      : hasFocus 
        ? "stroke-border/40" 
        : "stroke-border tree-connector"
  )}
  // ...
/>
```

**Zmiana 4: Dodanie osobnej klasy dla animacji podświetlonej ścieżki**

Tylko podświetlona linia będzie miała animację rysowania - nie wszystkie linie.

### Plik: `src/index.css`

```css
/* Tree connector drawing animation */
@keyframes draw-connector {
  from {
    stroke-dashoffset: 200;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* Statyczne linie - bez animacji */
.tree-connector {
  /* Brak animacji dla zwykłych linii */
}

/* Animacja rysowania TYLKO dla podświetlonej ścieżki */
.tree-connector-highlight {
  stroke-dasharray: 200;
  animation: draw-connector 0.8s ease-out forwards;
}
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/team-contacts/organization/OrganizationChart.tsx` | Poprawiona logika podświetlania + animationKey dla wymuszenia animacji |
| `src/index.css` | Rozdzielenie klas: statyczne linie vs animowane podświetlenie |

---

## Oczekiwany rezultat

1. **Poprawne podświetlanie** - Kliknięcie w "Sebastian Snopek (Klient)" podświetli TYLKO linię od niego przez "Sebastian Snopek (Partner)" do góry - nie wszystkie linie wychodzące od rodzica

2. **Animacja rysowania** - Przy kliknięciu w węzeł, podświetlona ścieżka będzie płynnie "rysowana" od góry do dołu, symulując efekt rysowania ołówkiem

3. **Pozostałe linie** - Zwykłe (niepodświetlone) linie nie mają animacji - są statyczne i widoczne od razu

