
# Nowa interaktywna wizualizacja struktury organizacji

## Cel

Zastąpienie obecnego widoku `OrganizationChart` (graf SVG z możliwością przewijania) nowym komponentem `InteractiveOrgChart` — pionowym drzewem kafelkowym z następującą mechaniką:

- **Domyślnie widoczny tylko poziom 1** (bezpośrednio poleceni)
- **Kliknięcie kafelka** → rozwija jego dzieci w poziomie poniżej, inne kafelki na tej samej linii stają się wyszarzone, kliknięty — powiększony i rozjaśniony
- **Ponowne kliknięcie** → zwija dzieci i przywraca normalny wygląd
- Łączniki SVG między kafelkami (krzywe Beziera)
- Smooth animacje CSS (`transition`)

---

## Mechanika interakcji (diagram)

```text
Poziom 0 (TY)
      │
      ├──────────────────────────────────────┐
      │                                      │
   [Ania ✓ WYBRANY]              [Jan - wyszarzony]  [Kasia - wyszarzony]
      │
      ├──────────────────┐
   [Piotr]            [Marek]
      │
  (domyślnie zwinięte)
```

Po kliknięciu innego kafelka (np. Jana):
```text
[Ania - wyszarzony]   [Jan ✓ WYBRANY]   [Kasia - wyszarzony]
                           │
                    (dzieci Jana się rozwijają)
```

---

## Architektura techniczna

### Nowy komponent: `InteractiveOrgChart`

Plik: `src/components/team-contacts/organization/InteractiveOrgChart.tsx`

Logika stanu:
- `expandedNodeId: string | null` — który węzeł jest aktualnie rozwinięty **na danym poziomie**
- Każdy poziom ma własny stan wybranego węzła, niezależnie od innych poziomów
- Dane prezentowane **level by level** — renderujemy wiersz po wierszu od góry do dołu

**Kluczowa zmiana podejścia**: zamiast rekurencyjnego drzewa, używamy podejścia **level-by-level rendering**:

```text
Stan: selectedPath = ['root_id', 'child_id', null]

Render:
  Wiersz 0: [root]                          ← zawsze
  Wiersz 1: [dziecko A, dziecko B, dziecko C] ← bo root jest w selectedPath[0]
  Wiersz 2: [wnuczek X, wnuczek Y]          ← bo dziecko B jest w selectedPath[1]
```

Gdy użytkownik kliknie "dziecko A":
- `selectedPath[1] = 'dziecko A id'`
- Wiersz 1: dziecko A = ACTIVE (powiększone), B i C = DIMMED
- Wiersz 2: dzieci dziecka A

### Styl kafelka w 3 stanach

| Stan | Wygląd |
|---|---|
| `normal` | Standardowy border + kolor roli |
| `active` | `scale-110`, jasniejsze tło, `ring-2 ring-primary`, cień |
| `dimmed` | `opacity-40 scale-95`, desaturowane (grayscale filtrem CSS) |

### Łączniki SVG

Każdy wiersz ma nad sobą warstwę SVG z krzywymi Beziera od wybranego węzła powyżej do każdego kafelka w bieżącym rzędzie. Implementacja analogiczna do obecnego `createCurvePath`.

---

## Pliki do modyfikacji / tworzenia

| Plik | Operacja | Opis |
|---|---|---|
| `src/components/team-contacts/organization/InteractiveOrgChart.tsx` | NOWY | Główny komponent nowej wizualizacji |
| `src/components/team-contacts/organization/index.ts` | EDYCJA | Dodanie eksportu `InteractiveOrgChart` |
| `src/components/team-contacts/TeamContactsTab.tsx` | EDYCJA | Podpięcie `InteractiveOrgChart` zamiast `OrganizationChart` w zakładce "Struktura" |
| `src/components/leader/LeaderOrgTreeView.tsx` | EDYCJA | Podpięcie `InteractiveOrgChart` zamiast `OrganizationChart` |

**Uwaga:** `OrganizationChart.tsx` pozostaje niezmieniony — nowy komponent go zastępuje, nie nadpisuje. To pozwoli na rollback jeśli zajdzie potrzeba.

---

## Szczegóły implementacji `InteractiveOrgChart`

### Stan komponentu

```typescript
// selectedPath: tablica ID wybranych węzłów, indeks = poziom
// selectedPath[0] = ID wybranego na poziomie 0 (zawsze = root.id, bo root jest jeden)
// selectedPath[1] = ID wybranego na poziomie 1 (który z bezpośrednich poleconych)
// selectedPath[2] = ID wybranego na poziomie 2 itd.
const [selectedPath, setSelectedPath] = useState<(string | null)[]>([tree.id]);
```

### Logika renderowania

```typescript
// Oblicz które węzły wyświetlić w każdym wierszu
const rows = buildRows(tree, selectedPath);
// rows[0] = [root]
// rows[1] = root.children (jeśli selectedPath[0] = root.id)
// rows[2] = selectedChild.children (jeśli selectedPath[1] != null)
```

### Obsługa kliknięcia

```typescript
const handleNodeClick = (node: OrgNode, level: number) => {
  const newPath = selectedPath.slice(0, level + 1);
  
  if (newPath[level] === node.id) {
    // Kliknięto ponownie ten sam → zwiń (usuń ten poziom i poniżej)
    newPath[level] = null;
  } else {
    // Kliknięto inny → zmień wybrany, usuń niższe wybory
    newPath[level] = node.id;
  }
  
  setSelectedPath(newPath);
};
```

### Animacje CSS

- Przejście między stanami: `transition-all duration-300 ease-in-out`
- Rozwijanie nowego wiersza: `animate-in slide-in-from-top-2 fade-in duration-300`
- Kafelki używają `transform: scale()` z płynnym przejściem

### Responsywność i scroll

- Kontener: `overflow-x-auto` z `scroll-behavior: smooth`
- Na mobilach kafelki nieco mniejsze (`sm:` breakpoint)
- Wiersz wyśrodkowany względem wybranego węzła powyżej (flexbox + `justify-center`)

---

## Wizualny efekt końcowy

```text
┌─────────────────────────────────────────────────────┐
│                                                     │
│            ⭐ TY (zawsze widoczny)                  │
│                       │                             │
│  ┌─────────────────────────────────────────────┐   │
│  │  [Jan]    [✓ ANN]    [Piotr]   [Kasia]      │   │
│  │ opacity-40  scale-110  opacity-40  opacity-40│   │
│  └─────────────────────────────────────────────┘   │
│                  ↑ aktywna linia łącząca           │
│  ┌───────────────────────────────┐                 │
│  │  [Marek]    [Zofia]   [Adam]  │  ← dzieci Ann   │
│  └───────────────────────────────┘                 │
│              (domyślnie zwinięte)                  │
└─────────────────────────────────────────────────────┘
```

---

## Zmiany w istniejących plikach

### `TeamContactsTab.tsx` — zakładka Struktura

Zmiana dotyczy tylko jednej linii: zamiana `<OrganizationChart>` → `<InteractiveOrgChart>` w sekcji `structureViewMode === 'graph'`. Przycisk "Graf" będzie teraz otwierał nową wizualizację.

### `LeaderOrgTreeView.tsx`

Analogicznie — w trybie `'graph'` podmiana `OrganizationChart` → `InteractiveOrgChart`.

---

## Co pozostaje bez zmian

- `OrganizationChart.tsx` — stary widok grafu (niedotykany)
- `OrganizationList.tsx` — widok listy (niedotykany)
- `OrganizationNode.tsx` — komponent kafelka (użyjemy go ponownie w nowym komponencie)
- `useOrganizationTree.ts` — hook danych (niedotykany)
- `useOrganizationTreeSettings.ts` — ustawienia (niedotykany)

Nowy komponent reużywa `OrganizationNode` z istniejącymi propsami `isSelected` i `hasFocus`, ale dodaje trzeci stan wizualny (`dimmed`) przez zewnętrzny wrapper.
