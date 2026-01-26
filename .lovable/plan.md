
# Plan: Naprawa animacji rysowania linii w strukturze organizacji

## Zidentyfikowane problemy

Na podstawie analizy screenshotów i kodu widzę następujące problemy:

| Problem | Opis | Wpływ |
|---------|------|-------|
| Stała wartość `stroke-dasharray` | Ustawiona na 200px - za mało dla długich ścieżek | Linie nie rysują się płynnie do końca |
| Brak `pathLength` | Animacja nie wie jaka jest długość ścieżki | Nierówne tempo rysowania |
| Animacja restartuje się nagle | Zmiana klucza powoduje natychmiastowe zniknięcie i ponowne pojawienie | Brak płynnego przejścia |

## Rozwiązanie

### Zmiana 1: Dynamiczna długość ścieżki z `pathLength`

**Plik:** `src/components/team-contacts/organization/OrganizationChart.tsx`

Zamiast polegać na stałej wartości `stroke-dasharray: 200`, użyjemy atrybutu `pathLength="1"` który normalizuje długość ścieżki do wartości 1. To sprawia, że animacja działa identycznie niezależnie od rzeczywistej długości linii.

**Linie 152-167 - dodanie `pathLength`:**
```tsx
return (
  <path
    key={`${child.id}-${isHighlighted ? animationKey : 'static'}`}
    d={createCurvePath(centerX, 0, childX, 32, 14)}
    pathLength={1}  // ← Normalizuje długość do 1
    className={cn(
      "fill-none transition-opacity duration-300",
      isHighlighted 
        ? "stroke-primary tree-connector-highlight" 
        : hasFocus 
          ? "stroke-border/40" 
          : "stroke-border tree-connector"
    )}
    strokeWidth={isHighlighted ? 3 : 2}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);
```

### Zmiana 2: Aktualizacja animacji CSS

**Plik:** `src/index.css`

Zmiana animacji aby używała znormalizowanych wartości (1 zamiast 200):

**Linie 273-292:**
```css
/* Tree connector drawing animation */
@keyframes draw-connector {
  from {
    stroke-dashoffset: 1;
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
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw-connector 0.6s ease-out forwards;
}
```

### Zmiana 3: Płynniejsze przejście przy zmianie wybranego węzła

**Plik:** `src/components/team-contacts/organization/OrganizationChart.tsx`

Usunięcie nagłej zmiany klucza - zamiast tego użyjemy tylko klasy CSS dla kontroli animacji. Klucz powinien być stabilny, a animacja powinna być triggerowana przez zmianę klasy.

**Linia 154 - stabilny klucz:**
```tsx
key={`connector-${node.id}-${child.id}`}
```

Aby wymusić restart animacji CSS bez zmiany klucza, dodamy `animation-delay` z małą wartością zależną od `animationKey`:

**Linia 156-163:**
```tsx
className={cn(
  "fill-none",
  isHighlighted 
    ? "stroke-primary tree-connector-highlight" 
    : hasFocus 
      ? "stroke-border/40 transition-opacity duration-200" 
      : "stroke-border tree-connector"
)}
style={isHighlighted ? { animationDelay: `${animationKey * 0}ms` } : undefined}
```

Alternatywnie, możemy zachować dynamiczny klucz ale dodać `transition-opacity` dla płynniejszego znikania/pojawiania się.

---

## Podsumowanie zmian

| Plik | Linia | Zmiana |
|------|-------|--------|
| `OrganizationChart.tsx` | 153 | Dodanie `pathLength={1}` do `<path>` |
| `OrganizationChart.tsx` | 156 | Dodanie `transition-opacity duration-300` |
| `index.css` | 275-280 | Zmiana `stroke-dashoffset: 200` → `1` |
| `index.css` | 289-291 | Zmiana `stroke-dasharray: 200` → `1` |

---

## Wizualizacja rozwiązania

```
PRZED (problem):
┌──────────────────────────────────────────┐
│  stroke-dasharray: 200                   │
│  Ścieżka o długości 400px                │
│  → Animacja rysuje tylko połowę linii!   │
└──────────────────────────────────────────┘

PO (rozwiązanie):
┌──────────────────────────────────────────┐
│  pathLength="1"                          │
│  stroke-dasharray: 1                     │
│  → Animacja rysuje 100% linii niezależnie│
│    od jej rzeczywistej długości          │
└──────────────────────────────────────────┘
```

---

## Sekcja techniczna

### Pełna zmiana w `src/components/team-contacts/organization/OrganizationChart.tsx`:

**Linie 152-168:**
```tsx
return (
  <path
    key={`connector-${node.id}-${child.id}-${isHighlighted ? animationKey : 'static'}`}
    d={createCurvePath(centerX, 0, childX, 32, 14)}
    pathLength={1}
    className={cn(
      "fill-none transition-opacity duration-300",
      isHighlighted 
        ? "stroke-primary tree-connector-highlight" 
        : hasFocus 
          ? "stroke-border/40" 
          : "stroke-border tree-connector"
    )}
    strokeWidth={isHighlighted ? 3 : 2}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);
```

### Pełna zmiana w `src/index.css`:

**Linie 273-292:**
```css
/* Tree connector drawing animation */
@keyframes draw-connector {
  from {
    stroke-dashoffset: 1;
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
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw-connector 0.6s ease-out forwards;
}
```
