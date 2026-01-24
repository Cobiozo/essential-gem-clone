
# Poprawki struktury organizacji - linie i interakcje

## Zidentyfikowane problemy

1. **Avatar za mały** - obecnie `w-7/w-8/w-9 h-7/h-8/h-9`
2. **Brak kliknięcia w puste pole** - nie ma handlera do resetu ścieżki
3. **Linia do Katarzyny Snopek niewidoczna** - linia pozioma nie pokrywa wszystkich dzieci
4. **Linie nie są płynne** - brak ciągłości od kafelka do kafelka

---

## Rozwiązania

### 1. Większy avatar

**Plik:** `OrganizationNode.tsx`

```typescript
const sizeConfig = {
  small: {
    avatar: 'w-10 h-10',  // było w-7 h-7
    // ...
  },
  medium: {
    avatar: 'w-12 h-12',  // było w-8 h-8
    // ...
  },
  large: {
    avatar: 'w-14 h-14',  // było w-9 h-9
    // ...
  },
};
```

### 2. Kliknięcie w puste pole resetuje ścieżkę

**Plik:** `OrganizationChart.tsx`

Dodanie handlera kliknięcia na kontener:

```typescript
const handleContainerClick = (e: React.MouseEvent) => {
  // Tylko jeśli kliknięto bezpośrednio w kontener (nie w węzeł)
  if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-node-container]') === null) {
    setSelectedNodeId(null);
    setHighlightedPath([]);
  }
};
```

Oraz dodanie atrybutu `data-node-container` na węzłach i wywołanie handlera:

```jsx
<div 
  className="min-w-max origin-top-left transition-transform duration-200"
  style={{ transform: `scale(${zoom / 100})` }}
  onClick={handleContainerClick}
>
```

### 3. Naprawienie linii poziomej (do Katarzyny Snopek)

**Problem:** Obecna linia pozioma używa złej kalkulacji (`calc(50% / ${node.children.length})`) - nie łączy wszystkich dzieci.

**Rozwiązanie:** Zmiana na obliczanie pozycji od pierwszego do ostatniego dziecka:

```typescript
{/* Horizontal line connecting all children */}
{settings.graph_show_lines && node.children.length > 1 && (
  <div 
    className={cn(
      "absolute top-0 h-0.5 rounded-full transition-all duration-300",
      hasFocus ? "bg-border/50" : "bg-border"
    )}
    style={{
      left: `calc(${100 / (node.children.length * 2)}%)`,
      right: `calc(${100 / (node.children.length * 2)}%)`,
    }}
  />
)}
```

### 4. Linie zaokrąglone i ciągłe

**Zmiany w `TreeBranch`:**

Obecnie mamy:
- Linia pionowa od rodzica (h-4, -top-4)
- Linia pozioma łącząca dzieci
- Linia pionowa do dziecka (h-2, -top-2)

**Problem:** Luki między liniami, brak płynności.

**Rozwiązanie - użycie SVG do rysowania linii:**

Zamiast wielu divów, użycie jednego SVG który rysuje ciągłą ścieżkę z zaokrąglonymi rogami:

```tsx
{/* SVG connector lines */}
{settings.graph_show_lines && (
  <svg 
    className="absolute inset-0 pointer-events-none overflow-visible"
    style={{ width: '100%', height: '100%' }}
  >
    {/* Vertical line from parent to horizontal bar */}
    <line 
      x1="50%" y1="-24" x2="50%" y2="0"
      stroke={isOnPath && hasFocus ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
      strokeWidth={isOnPath && hasFocus ? 4 : 2}
      strokeLinecap="round"
    />
  </svg>
)}
```

Alternatywne rozwiązanie bez SVG - skorygowane divy:

```tsx
{/* Children container with proper connectors */}
{hasChildren && isExpanded && (
  <div className="relative mt-8">
    {/* Single vertical line from parent center down */}
    {settings.graph_show_lines && (
      <div className={cn(
        "absolute left-1/2 -top-6 h-6 -translate-x-1/2 rounded-full",
        isOnPath && hasFocus ? "w-1 bg-primary" : "w-0.5 bg-border"
      )} />
    )}
    
    {/* Horizontal connector spanning all children */}
    {settings.graph_show_lines && node.children.length > 1 && (
      <div className="absolute top-0 left-0 right-0 flex justify-center">
        <div 
          className={cn(
            "h-0.5 rounded-full absolute top-0",
            hasFocus && !isOnPath ? "bg-border/50" : "bg-border"
          )}
          style={{
            left: `calc(50% / ${node.children.length})`,
            right: `calc(50% / ${node.children.length})`,
          }}
        />
      </div>
    )}
    
    {/* Children with vertical lines */}
    <div className="flex gap-3 justify-center">
      {node.children.map((child) => {
        const childIsOnPath = highlightedPath.includes(child.id);
        return (
          <div key={child.id} className="relative flex flex-col items-center pt-4">
            {/* Vertical line from horizontal bar to child */}
            {settings.graph_show_lines && (
              <div className={cn(
                "absolute left-1/2 top-0 h-4 -translate-x-1/2 rounded-full",
                childIsOnPath && hasFocus ? "w-1 bg-primary" : "w-0.5 bg-border"
              )} />
            )}
            <TreeBranch ... />
          </div>
        );
      })}
    </div>
  </div>
)}
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/team-contacts/organization/OrganizationNode.tsx` | Zwiększenie rozmiaru avatara |
| `src/components/team-contacts/organization/OrganizationChart.tsx` | Reset ścieżki przy kliknięciu w puste pole + naprawa linii łączących |

---

## Szczegóły techniczne

### OrganizationNode.tsx

**Zmiana w `sizeConfig`:**
```typescript
const sizeConfig = {
  small: {
    container: 'min-w-[140px] max-w-[180px] p-2',
    avatar: 'w-10 h-10',        // zwiększone z w-7 h-7
    text: 'text-[10px]',
    nameText: 'text-xs',
    badge: 'text-[9px] px-1 py-0',
    infoText: 'text-[9px]',
  },
  medium: {
    container: 'min-w-[160px] max-w-[200px] p-2.5',
    avatar: 'w-12 h-12',        // zwiększone z w-8 h-8
    text: 'text-xs',
    nameText: 'text-sm',
    badge: 'text-[10px] px-1.5 py-0.5',
    infoText: 'text-[10px]',
  },
  large: {
    container: 'min-w-[180px] max-w-[220px] p-3',
    avatar: 'w-14 h-14',        // zwiększone z w-9 h-9
    text: 'text-sm',
    nameText: 'text-base',
    badge: 'text-xs px-2 py-0.5',
    infoText: 'text-xs',
  },
};
```

### OrganizationChart.tsx

**1. Handler kliknięcia w puste miejsce:**
```typescript
const handleContainerClick = (e: React.MouseEvent) => {
  const target = e.target as HTMLElement;
  // Reset tylko jeśli kliknięto w tło, nie w węzeł
  if (!target.closest('[data-org-node]')) {
    setSelectedNodeId(null);
    setHighlightedPath([]);
  }
};
```

**2. Naprawiona struktura linii w TreeBranch (linie 94-145):**

```typescript
{/* Children */}
{hasChildren && isExpanded && (
  <div className="relative mt-8">
    {/* Vertical line from parent to horizontal connector */}
    {settings.graph_show_lines && (
      <div className={cn(
        "absolute left-1/2 -top-6 h-6 -translate-x-1/2 rounded-full",
        isOnPath && hasFocus ? "w-1 bg-primary" : "w-0.5 bg-border"
      )} />
    )}
    
    {/* Children row */}
    <div className="flex gap-4 justify-center relative">
      {/* Horizontal line spanning from first to last child */}
      {settings.graph_show_lines && node.children.length > 1 && (
        <div 
          className={cn(
            "absolute -top-2 h-0.5 rounded-full",
            hasFocus ? "bg-border/60" : "bg-border"
          )}
          style={{
            left: `calc(50% / ${node.children.length})`,
            right: `calc(50% / ${node.children.length})`,
          }}
        />
      )}
      
      {node.children.map((child, index) => {
        const childIsOnPath = highlightedPath.includes(child.id);
        return (
          <div key={child.id} className="relative flex flex-col items-center">
            {/* Vertical line from horizontal bar to child */}
            {settings.graph_show_lines && (
              <div className={cn(
                "absolute left-1/2 -top-2 h-4 -translate-x-1/2 rounded-full",
                childIsOnPath && hasFocus ? "w-1 bg-primary" : "w-0.5 bg-border"
              )} />
            )}
            <div className="pt-2">
              <TreeBranch ... />
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
```

**3. Dodanie atrybutu na węzłach w OrganizationNode:**
```tsx
<div
  data-org-node
  onClick={onClick}
  className={cn(...)}
>
```

---

## Oczekiwany rezultat

1. **Większe avatary** - lepiej widoczne zdjęcia/inicjały
2. **Kliknięcie w puste pole** - resetuje podświetlenie, wszystkie kafelki znów wyraźne
3. **Linia do Katarzyny Snopek** - widoczna, poprawnie łączy wszystkie dzieci
4. **Zaokrąglone, ciągłe linie** - płynne połączenia od rodzica do dzieci
