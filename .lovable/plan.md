
# Plan: Przenoszenie elementów między kontenerami (cross-container drag-and-drop)

## Diagnoza problemu

W pliku `HtmlHybridEditor.tsx` w funkcji `handleDragEnd` (linie 258-266) jest **celowa blokada** przenoszenia między kontenerami:

```tsx
// Only allow reordering within the same parent
if (activeResult.parent?.id !== overResult.parent?.id) {
  toast({
    title: "Niedozwolona operacja",
    description: "Można przenosić elementy tylko w obrębie tego samego kontenera.",
    variant: "destructive"
  });
  return;
}
```

To powoduje, że użytkownik **nie może** przenieść zduplikowanego elementu do innego kontenera.

---

## Rozwiązanie

Rozszerzę logikę `handleDragEnd` aby obsługiwała przenoszenie między różnymi kontenerami:

### Nowa logika:

1. **Jeśli rodzice są tacy sami** → sortowanie w obrębie kontenera (obecne zachowanie)
2. **Jeśli rodzice są różni** → przeniesienie elementu między kontenerami:
   - Usuń element z oryginalnego rodzica
   - Dodaj element do nowego rodzica (obok elementu docelowego "over")
   - Sprawdź czy element docelowy jest kontenerem - jeśli tak, wstaw do środka

### Szczegóły implementacji:

```text
Plik: src/components/admin/html-editor/HtmlHybridEditor.tsx

Zmiana w handleDragEnd (linie 258-266):

USUNIĘCIE blokady:
- if (activeResult.parent?.id !== overResult.parent?.id) { 
-   toast(...);
-   return;
- }

DODANIE nowej logiki dla przenoszenia między kontenerami:

1. Jeśli rodzice są różni:
   a) Usuń element aktywny z jego obecnego rodzica
   b) Określ pozycję wstawienia:
      - Jeśli element docelowy (over) jest kontenerem → wstaw do jego children
      - Jeśli nie jest kontenerem → wstaw obok niego w tym samym rodzicu
   c) Aktualizuj oba kontenery w jednej operacji
   d) Pokaż toast "Element przeniesiony"

2. Jeśli rodzice są tacy sami:
   - Zachowaj obecną logikę sortowania (arrayMove)
```

---

## Kod rozwiązania

### Zmiana w `handleDragEnd`:

```tsx
// Handle drag end for reordering AND moving between containers
const handleDragEnd = useCallback((event: DragEndEvent) => {
  const { active, over } = event;
  
  if (!over || active.id === over.id) return;
  
  const activeId = active.id as string;
  const overId = over.id as string;
  
  // Helper to find element and its parent
  const findElementAndParent = (...);  // unchanged
  
  const activeResult = findElementAndParent(elements, activeId);
  const overResult = findElementAndParent(elements, overId);
  
  if (!activeResult.element || !overResult.element) return;
  
  // Check if over element is a container
  const isOverContainer = ['div', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav', 'figure']
    .includes(overResult.element.tagName.toLowerCase());
  
  // CASE 1: Moving BETWEEN different containers
  if (activeResult.parent?.id !== overResult.parent?.id) {
    // Step 1: Remove element from old location
    let updatedElements = deleteElementById(elements, activeId);
    
    // Step 2: Determine where to insert
    if (isOverContainer && overResult.element.id !== activeResult.parent?.id) {
      // Drop into the container (as first child)
      const targetContainer = findElementById(updatedElements, overId);
      if (targetContainer) {
        updatedElements = updateElementById(updatedElements, overId, {
          children: [activeResult.element, ...targetContainer.children]
        });
      }
    } else {
      // Drop beside the over element (in same parent)
      if (overResult.parent) {
        const overIndex = overResult.parent.children.findIndex(c => c.id === overId);
        const newChildren = [...overResult.parent.children];
        newChildren.splice(overIndex + 1, 0, activeResult.element);
        updatedElements = updateElementById(updatedElements, overResult.parent.id, {
          children: newChildren
        });
      } else {
        // Over is root level
        const overIndex = updatedElements.findIndex(el => el.id === overId);
        updatedElements.splice(overIndex + 1, 0, activeResult.element);
      }
    }
    
    syncAndSave(updatedElements);
    toast({
      title: "Element przeniesiony",
      description: "Element został przeniesiony do innego kontenera."
    });
    return;
  }
  
  // CASE 2: Reordering within SAME container (existing logic)
  // ... rest unchanged
}, [elements, syncAndSave, toast, updateElementById, deleteElementById, findElementById]);
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/html-editor/HtmlHybridEditor.tsx` | Rozszerzenie `handleDragEnd` o obsługę przenoszenia między kontenerami |

---

## Oczekiwane rezultaty

1. **Przenoszenie między kontenerami** - elementy można przeciągać z jednego kontenera do drugiego
2. **Drop do kontenera** - upuszczenie na kontener wstawia element do jego wnętrza
3. **Drop obok elementu** - upuszczenie na element nie-kontener wstawia obok niego
4. **Zachowanie sortowania** - sortowanie w ramach tego samego kontenera działa jak dotychczas
5. **Wizualne potwierdzenie** - toast z informacją "Element przeniesiony"
