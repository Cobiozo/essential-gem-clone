
# Rozbudowa widżetu zespołu i zmiana kafelków struktury organizacji

## Zakres zmian

1. **Widżet Zespołu na dashboardzie** - dodanie przycisku "Struktura" obok "Zarządzaj"
2. **Kontrolki zoom** - dodanie przycisków powiększania/pomniejszania całego grafu
3. **Nowy layout kafelków** - szerszy prostokąt z dwukolumnowym układem

---

## 1. Przycisk "Struktura" w widżecie zespołu

### Plik: `src/components/dashboard/widgets/TeamContactsWidget.tsx`

Dodanie drugiego przycisku obok "Zarządzaj", który nawiguje bezpośrednio do zakładki struktury w widoku grafu:

```text
┌────────────────────────────────────────┐
│  👥 Zespół    [Struktura] [Zarządzaj →]│
│  ─────────────────────────────────────│
│  Łączna liczba kontaktów          3   │
│  ...                                   │
└────────────────────────────────────────┘
```

**Zmiany:**
- Import ikony `TreePine` z lucide-react
- Dodanie przycisku "Struktura" z nawigacją do `/my-account?tab=team-contacts&subTab=structure`
- Warunek dostępu: przycisk widoczny tylko gdy `canAccessTree()` zwraca true

---

## 2. Kontrolki Zoom dla grafu organizacji

### Plik: `src/components/team-contacts/organization/OrganizationChart.tsx`

Dodanie stanu `zoom` (skala 50%-150%) i przycisków + / - w nagłówku karty:

```text
┌─────────────────────────────────────────────────────────────────┐
│  👥 Struktura organizacji           [ 🔍- ] 100% [ 🔍+ ]        │
│  ─────────────────────────────────────────────────────────────  │
│                       (tree content at scale)                   │
└─────────────────────────────────────────────────────────────────┘
```

**Implementacja:**
- `const [zoom, setZoom] = useState(100)`
- Przyciski `ZoomIn` i `ZoomOut` z lucide-react
- CSS transform na kontenerze drzewa: `transform: scale(${zoom / 100})`
- Zakres: 50% - 150%, krok: 10%

---

## 3. Nowy layout kafelków OrganizationNode

### Obecny layout (pionowy):
```text
┌─────────────────┐
│    [AVATAR]     │
│    Sebastian    │
│     Snopek      │
│   [Partner]     │
│   121118999     │
│    👤 +4        │
└─────────────────┘
```

### Nowy layout (szerszy, dwukolumnowy):
```text
┌─────────────────────────────────────────────┐
│  ┌────────┐  │  Sebastian Snopek            │
│  │ AVATAR │  │  [Partner]                   │
│  │   SS   │  │                              │
│  └────────┘  │  121118999                   │
│              │  email@example.com           │
│──────────────┴──────────────────────────────│
│            [ ▼ ]  👤 +4                     │
└─────────────────────────────────────────────┘
```

### Plik: `src/components/team-contacts/organization/OrganizationNode.tsx`

**Zmiany struktury:**
1. Zmiana z `flex-col` na dwukolumnowy grid/flex layout
2. Lewa kolumna: Avatar z inicjałami
3. Prawa kolumna: Imię+nazwisko, rola (badge), dane dodatkowe (EQID, email, telefon - kontrolowane przez admin)
4. Dolny pasek: Przycisk rozwijania + licznik użytkowników w strukturze

**Nowa konfiguracja rozmiarów:**
```typescript
const sizeConfig = {
  small: {
    container: 'min-w-[180px] p-3',
    avatar: 'w-12 h-12',
    text: 'text-xs',
    badge: 'text-[10px] px-1.5 py-0.5',
  },
  medium: {
    container: 'min-w-[220px] p-4',
    avatar: 'w-14 h-14',
    text: 'text-sm',
    badge: 'text-xs px-2 py-0.5',
  },
  large: {
    container: 'min-w-[280px] p-5',
    avatar: 'w-16 h-16',
    text: 'text-base',
    badge: 'text-sm px-2.5 py-1',
  },
};
```

---

## Szczegóły techniczne

### Plik 1: `src/components/dashboard/widgets/TeamContactsWidget.tsx`

**Zmiany:**
- Dodanie hooka `useOrganizationTreeSettings`
- Import `TreePine` icon
- Dodanie przycisku "Struktura" przed "Zarządzaj"
- Warunek widoczności: `canAccessTree() && treeSettings?.is_enabled`

### Plik 2: `src/components/team-contacts/organization/OrganizationChart.tsx`

**Zmiany:**
- Import `ZoomIn`, `ZoomOut` z lucide-react
- Dodanie stanu: `const [zoom, setZoom] = useState(100)`
- Przyciski zoom w nagłówku CardHeader
- Transform na kontenerze drzewa w ScrollArea

### Plik 3: `src/components/team-contacts/organization/OrganizationNode.tsx`

**Zmiany:**
- Całkowita przebudowa layoutu komponentu
- Dwukolumnowy układ: avatar | dane
- Dolny pasek z licznikiem dzieci przy ikonie rozwijania
- Zachowanie wszystkich warunków widoczności z settings (show_eq_id, show_email, show_phone, show_role_badge, show_avatar, show_statistics)

### Plik 4: `src/components/team-contacts/organization/OrganizationChart.tsx` (TreeBranch)

**Zmiany:**
- Przeniesienie licznika dzieci do OrganizationNode (dolny pasek)
- Bez zmian logiki rozwijania/zwijania

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/widgets/TeamContactsWidget.tsx` | Dodanie przycisku "Struktura" z nawigacją |
| `src/components/team-contacts/organization/OrganizationChart.tsx` | Dodanie kontrolek zoom (+/-) i transform scale |
| `src/components/team-contacts/organization/OrganizationNode.tsx` | Nowy dwukolumnowy layout kafelka |

---

## Oczekiwany rezultat

1. W widżecie "Zespół" na dashboardzie widoczny nowy przycisk "Struktura" obok "Zarządzaj"
2. W widoku grafu struktury - kontrolki powiększania/pomniejszania widoku
3. Kafelki w grafie mają nowy, szerszy layout z dwoma kolumnami i informacjami u podstawy
