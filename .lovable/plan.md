
# Zmiana layoutu pierwszej linii drzewa organizacji na układ wielorzędowy

## Problem
Pierwsza linia (bezpośrednio poleceni) zawiera ponad 100 kafelków renderowanych w jednym rzędzie `flex` bez zawijania. Wymusza to poziome przewijanie i zmniejszanie zoomu do 32%, co czyni kafelki nieczytelne.

## Rozwiązanie

Zmiana dotyczy wyłącznie komponentu `OrganizationChart.tsx` — modyfikacja `TreeBranch` tak, aby:

1. **Pierwszy poziom dzieci** (level 0 -> level 1) używał `flex-wrap` zamiast jednego rzędu — kafelki zawijają się w wiele wierszy bez scrollowania
2. **Rozwijanie subtree**: kliknięcie kafelka w pierwszej linii rozwija jego dzieci **pod nim** w dedykowanej sekcji poniżej siatki (a nie obok, jak teraz)
3. **Tylko jeden rozwinięty kafelek na raz** w pierwszej linii — kliknięcie innego zwija poprzedni
4. **Głębsze poziomy** (level 2+) zachowują obecny layout horyzontalny z liniami SVG

## Szczegóły techniczne

### Plik: `src/components/team-contacts/organization/OrganizationChart.tsx`

**Zmiana 1: TreeBranch — warunkowy layout dla level 0**

Gdy `isRoot` (level 0), dzieci renderowane są w siatce `flex-wrap` zamiast `flex`:
```
// Dzieci root-a: siatka wielorzędowa
<div className="flex flex-wrap gap-3 justify-center max-w-full">
  {node.children.map(child => (
    <OrganizationNode ... onClick={() => handleChildSelect(child.id)} />
  ))}
</div>
```

**Zmiana 2: Rozwinięty subtree pod siatką**

Po siatce kafelków pojawia się sekcja z subtree wybranego dziecka — renderowana w standardowym horyzontalnym `TreeBranch`:
```
// Pod siatką: rozwinięta gałąź wybranego dziecka
{expandedChildId && (
  <div className="mt-6 flex justify-center">
    <TreeBranch
      node={selectedChildNode}
      level={1}
      isRoot={false}
      ...
    />
  </div>
)}
```

**Zmiana 3: Stan expandedChildId w TreeBranch (level 0)**

Nowy stan `expandedFirstLineChild` w `TreeBranch` dla root-a. Kliknięcie kafelka w siatce:
- Jeśli ten sam kafelek — zwija (null)
- Jeśli inny — rozszerza wybranego

**Zmiana 4: Usunięcie SVG connectorów dla siatki**

Linie SVG Beziera nie mają sensu w layoutcie wielorzędowym. Dla level 0, pomijamy rendering SVG. Connectors pozostają dla level 1+ (głębsze gałęzie).

**Zmiana 5: Wizualne wyróżnienie wybranego kafelka w siatce**

Wybrany kafelek w siatce dostaje `ring-2 ring-primary` + delikatną strzałkę/wskaźnik w dół, żeby wskazać rozwinięty subtree poniżej.

### Zachowane bez zmian
- Kolorystyka ról (niebieski/fioletowy/zielony) — bez zmian w `OrganizationNode.tsx`
- Funkcja drag-to-pan (obsługa myszy i dotyku) — bez zmian
- Zoom (pinch + przyciski) — bez zmian
- Statystyki, upline, label "TY" — bez zmian
- SVG connectors dla poziomów 1+ — bez zmian

### Auto-zoom
Aktualizacja logiki auto-zoom (linie 250-260): nie trzeba już skalować do szerokości 100+ kafelków w jednym rzędzie. Zoom może startować od ~80-100% bo siatka sama się zawija.

## Efekt wizualny

```text
         ┌─────┐
         │ TY  │  ← root
         └──┬──┘

  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
  │ A  │ │ B* │ │ C  │ │ D  │ │ E  │  ← 1. linia, flex-wrap
  └────┘ └────┘ └────┘ └────┘ └────┘
  ┌────┐ ┌────┐ ┌────┐
  │ F  │ │ G  │ │ H  │                 ← następny wiersz siatki
  └────┘ └────┘ └────┘

  ═══════ Gałąź: B ════════════════
         ┌────┐
         │ B  │  ← wybrany
         └──┬──┘
      ┌────┐ ┌────┐
      │ B1 │ │ B2 │                    ← subtree B (standardowy layout)
      └────┘ └────┘
```

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/team-contacts/organization/OrganizationChart.tsx` | Warunkowy layout flex-wrap dla level 0, rozwinięcie subtree pod siatką, aktualizacja auto-zoom |
