

# Płynne linie łączące w strukturze organizacji - SVG Path

## Problem

Obecne rozwiązanie używa prostokątnych divów (`w-0.5`, `h-6`, etc.) do rysowania linii, co daje:
- Kanciaste połączenia bez ciągłości
- Brak płynności między segmentami
- Brak możliwości animacji rysowania

## Rozwiązanie - SVG Path z krzywymi Beziera

Zastąpienie divów przez dedykowany komponent `TreeConnectors` używający SVG z:
- Płynnymi krzywymi ścieżkami (cubic bezier)
- Animacją rysowania linii (`stroke-dasharray` + `stroke-dashoffset`)
- Zaokrąglonymi zakończeniami (`stroke-linecap: round`)

---

## Wizualizacja porównawcza

**Obecne (divy):**
```text
     │
     │
─────┼─────
     │
```

**Nowe (SVG curves):**
```text
     │
     ╰──┬──╮
        │  │
```

---

## Architektura rozwiązania

### 1. Nowy komponent: `TreeConnectors.tsx`

Komponent SVG rysujący płynne linie:

```typescript
interface TreeConnectorsProps {
  childCount: number;
  childPositions: number[]; // X positions of children
  isOnPath: boolean;
  highlightedChildrenIndexes: number[];
  hasFocus: boolean;
  animate: boolean;
}
```

**SVG Path z krzywą:**
```typescript
// Ścieżka od rodzica do dziecka z zaokrągleniem
const createPath = (startX: number, startY: number, endX: number, endY: number) => {
  const midY = startY + (endY - startY) / 2;
  const curveRadius = 8; // promień zaokrąglenia
  
  return `
    M ${startX} ${startY}
    V ${midY - curveRadius}
    Q ${startX} ${midY}, ${startX + Math.sign(endX - startX) * curveRadius} ${midY}
    H ${endX - Math.sign(endX - startX) * curveRadius}
    Q ${endX} ${midY}, ${endX} ${midY + curveRadius}
    V ${endY}
  `;
};
```

### 2. Animacja rysowania

CSS animacja symulująca rysowanie ołówkiem:

```css
@keyframes draw-line {
  0% {
    stroke-dashoffset: 200;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.connector-line {
  stroke-dasharray: 200;
  stroke-dashoffset: 200;
  animation: draw-line 0.6s ease-out forwards;
}

.connector-line-highlighted {
  animation: draw-line 0.4s ease-out forwards;
}
```

### 3. Integracja z TreeBranch

**Zmiana w `TreeBranch`:**
- Usunięcie divów rysujących linie
- Dodanie kontenera `relative` z SVG overlay
- Obliczanie pozycji dzieci za pomocą `useRef` i `getBoundingClientRect`

---

## Szczegóły implementacji

### Plik 1: `src/components/team-contacts/organization/TreeConnectors.tsx` (NOWY)

```typescript
import React from 'react';
import { cn } from '@/lib/utils';

interface TreeConnectorsProps {
  parentRef: React.RefObject<HTMLDivElement>;
  childRefs: React.RefObject<HTMLDivElement>[];
  isOnPath: boolean;
  highlightedChildren: string[];
  hasFocus: boolean;
}

export const TreeConnectors: React.FC<TreeConnectorsProps> = ({
  parentRef,
  childRefs,
  isOnPath,
  highlightedChildren,
  hasFocus,
}) => {
  // Renderowanie SVG z path dla każdego dziecka
  // Użycie useLayoutEffect do pomiaru pozycji
  // Płynne krzywe Beziera z animacją
};
```

### Plik 2: `src/index.css` - Animacje

```css
/* Animacja rysowania linii */
@keyframes draw-connector {
  from {
    stroke-dashoffset: 200;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.tree-connector {
  stroke-dasharray: 200;
  animation: draw-connector 0.5s ease-out forwards;
}

.tree-connector-highlighted {
  animation: draw-connector 0.3s ease-out forwards;
}
```

### Plik 3: `OrganizationChart.tsx` - Refaktoryzacja TreeBranch

**Usuwane:**
- Wszystkie divy do linii (linie 97-103, 107-119, 126-131)

**Dodawane:**
- SVG overlay z ścieżkami path
- Refs do mierzenia pozycji węzłów

**Struktura nowych linii:**
```tsx
{/* Children section */}
{hasChildren && isExpanded && (
  <div className="relative mt-8">
    {/* SVG Connectors - overlay */}
    {settings.graph_show_lines && (
      <svg 
        className="absolute inset-0 pointer-events-none overflow-visible"
        style={{ 
          width: '100%', 
          height: '100%',
          top: '-24px', // wysokość linii od rodzica
        }}
      >
        {/* Pionowa linia od rodzica do środka poziomej */}
        <path
          d={`M 50% 0 V 24`} // prosta pionowa
          className={cn(
            "tree-connector fill-none",
            isOnPath && hasFocus 
              ? "stroke-primary stroke-[3px]" 
              : "stroke-border stroke-[2px]"
          )}
          strokeLinecap="round"
        />
        
        {/* Krzywe do każdego dziecka */}
        {node.children.map((child, index) => {
          const childIsOnPath = highlightedPath.includes(child.id);
          const offsetX = calculateChildOffset(index, node.children.length);
          
          return (
            <path
              key={child.id}
              d={createCurvePath(0, 24, offsetX, 48)}
              className={cn(
                "tree-connector fill-none",
                childIsOnPath && hasFocus 
                  ? "stroke-primary stroke-[3px]" 
                  : "stroke-border stroke-[2px]"
              )}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            />
          );
        })}
      </svg>
    )}
    
    {/* Children nodes */}
    <div className="flex gap-4 justify-center">
      {node.children.map(...)}
    </div>
  </div>
)}
```

---

## Kalkulacja ścieżek

### Funkcja tworząca płynną krzywą

```typescript
const createCurvePath = (
  startX: number, // środek rodzica
  startY: number, // dolna krawędź rodzica
  endX: number,   // środek dziecka
  endY: number,   // górna krawędź dziecka
  curveRadius: number = 12
): string => {
  const midY = startY + (endY - startY) / 2;
  const direction = Math.sign(endX - startX) || 0;
  
  if (direction === 0) {
    // Prosta linia pionowa
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }
  
  // Krzywa z zaokrąglonymi rogami
  return `
    M ${startX} ${startY}
    V ${midY - curveRadius}
    Q ${startX} ${midY}, ${startX + direction * curveRadius} ${midY}
    H ${endX - direction * curveRadius}
    Q ${endX} ${midY}, ${endX} ${midY + curveRadius}
    V ${endY}
  `.trim();
};
```

---

## Efekt końcowy

1. **Płynne linie** - krzywe Beziera zamiast kanciastych divów
2. **Animacja rysowania** - linie "rysują się" płynnie przy rozwijaniu
3. **Podświetlanie ścieżki** - grubsza, kolorowa linia na wybranej ścieżce
4. **Zaokrąglone zakończenia** - `stroke-linecap: round`
5. **Ciągłość** - jedna ścieżka SVG od rodzica do dziecka

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/team-contacts/organization/OrganizationChart.tsx` | Refaktoryzacja TreeBranch - SVG zamiast divów |
| `src/index.css` | Animacje draw-connector |

