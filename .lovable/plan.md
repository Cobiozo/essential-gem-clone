

# Fix: Zwijanie elementów wewnątrz paska bocznego admina

## Problem
1. Pierwsza kategoria ("Strona i wygląd") ma `defaultOpen: true` — rozwija się automatycznie przy wejściu
2. `toggleCategory` pozwala na otwarcie wielu kategorii jednocześnie
3. Sidebar sam (`SidebarProvider`) powinien być **rozwinięty** (`defaultOpen={true}`), bo chodzi o zwijanie kategorii wewnątrz, nie całego paska

## Zmiany

### 1. `src/components/admin/AdminSidebar.tsx`

**a)** Usunąć `defaultOpen: true` z pierwszej kategorii nawigacyjnej (linia ~113):
```typescript
// Było:
defaultOpen: true,
// Usunąć tę linię
```

**b)** Zmienić inicjalizację `openCategories` — wszystkie zamknięte na start (linia 231-238):
```typescript
const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
```

**c)** Zmienić `toggleCategory` na zachowanie accordion (tylko jedna otwarta naraz) (linia obecna):
```typescript
const toggleCategory = (categoryId: string) => {
  setOpenCategories((prev) => {
    const isCurrentlyOpen = prev[categoryId];
    // Zamknij wszystkie, otwórz tylko klikniętą (jeśli była zamknięta)
    const next: Record<string, boolean> = {};
    if (!isCurrentlyOpen) {
      next[categoryId] = true;
    }
    return next;
  });
};
```

### 2. `src/pages/Admin.tsx`

Przywrócić `defaultOpen={true}` w `SidebarProvider` — pasek boczny ma być widoczny, tylko kategorie wewnątrz zwinięte.

### Podsumowanie
- Przy wejściu: sidebar rozwinięty, ale **żadna** kategoria nie jest otwarta
- Kliknięcie kategorii otwiera ją i **zamyka** wszystkie inne (accordion)
- Wyszukiwarka nadal rozwija pasujące kategorie automatycznie

