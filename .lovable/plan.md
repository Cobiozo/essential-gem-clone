
# Plan: Ulepszenie edytora HTML i powiększenie miniaturek wydarzeń

## Podsumowanie zmian

Zdiagnozowałem dwa główne problemy:

1. **Miniaturki wydarzeń są za małe** - aktualnie mają rozmiar 56x56px (`w-14 h-14`)
2. **Edytor stron HTML wymaga ulepszeń**:
   - Okno dialogowe edytora jest za małe
   - Dodawanie elementów "wewnątrz" zaznaczonego miejsca nie działa poprawnie
   - Brak drag-and-drop dla elementów wewnątrz kontenerów (zagnieżdżone elementy)
   - Pozycja "Więcej" nie obsługuje prawidłowo wstawiania w zaznaczone miejsce

---

## Szczegóły techniczne

### Zmiana 1: Powiększenie miniaturek wydarzeń

**Plik**: `src/components/events/EventCardCompact.tsx`

**Aktualne rozwiązanie** (linia 544):
```tsx
<div className="w-14 h-14 rounded-lg overflow-hidden...">
```

**Nowe rozwiązanie**:
```tsx
<div className="w-20 h-20 rounded-lg overflow-hidden...">
```

Zmiana z 56px na 80px - znaczna poprawa widoczności przy zachowaniu kompaktowego układu.

---

### Zmiana 2: Powiększenie okna edytora HTML

**Plik**: `src/components/admin/HtmlPagesManagement.tsx`

Aktualne ograniczenia:
- `max-w-5xl` (1024px)
- `h-[650px]` dla edytora wizualnego

Nowe wartości:
- `max-w-7xl` (1280px) lub nawet pełne `max-w-[95vw]`
- `h-[calc(90vh-180px)]` dla dynamicznej wysokości

**Aktualna linia 358**:
```tsx
<DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
```

**Nowa wersja**:
```tsx
<DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col">
```

Oraz aktualizacja wysokości `TabsContent` dla edytora (linia 438):
```tsx
<TabsContent value="preview" className="mt-0 h-[calc(90vh-220px)]">
```

---

### Zmiana 3: Ulepszenie wstawiania elementów w zaznaczone miejsce

**Plik**: `src/components/admin/html-editor/HtmlElementToolbar.tsx`

Aktualnie przycisk "Pozycja wstawiania" (linia 309-330) **nie przekazuje wybranej pozycji** do funkcji `onAddElement`. Opcje dropdown menu nie wywołują żadnej akcji.

**Problem** (linie 320-327):
```tsx
<DropdownMenuItem onClick={() => {}}>
  Przed zaznaczonym
</DropdownMenuItem>
<DropdownMenuItem onClick={() => {}}>
  Po zaznaczonym
</DropdownMenuItem>
<DropdownMenuItem onClick={() => {}}>
  Wewnątrz zaznaczonego
</DropdownMenuItem>
```

**Rozwiązanie**:
1. Zamienić pusty `onClick={() => {}}` na przekazanie właściwej pozycji
2. Zmienić menu "Więcej" aby respektowało wybraną pozycję wstawiania
3. Dodać stan `insertPosition` do komponentu

Nowy interfejs:
```tsx
const [insertPosition, setInsertPosition] = useState<'before' | 'after' | 'inside'>('after');

// W dropdown "Więcej" - każdy element będzie dodawany z wybraną pozycją
const handleAdd = (html: string) => {
  onAddElement(html, insertPosition);
};
```

---

### Zmiana 4: Drag-and-drop dla elementów wewnątrz kontenerów (zagnieżdżonych)

**Plik**: `src/components/admin/html-editor/HtmlHybridEditor.tsx`

Aktualny problem: `SortableContext` (linia 479-481) obejmuje tylko elementy pierwszego poziomu:
```tsx
<SortableContext 
  items={elements.map(el => el.id)} 
  strategy={verticalListSortingStrategy}
>
```

**Rozwiązanie**:
1. Rozszerzyć `DraggableHtmlElement` o obsługę dzieci z własnym kontekstem sortowania
2. Dodać rekurencyjny `SortableContext` dla każdego kontenera z dziećmi
3. Zmodyfikować `handleDragEnd` aby obsługiwał przenoszenie między kontenerami

**Plik**: `src/components/admin/html-editor/DraggableHtmlElement.tsx`

Dodać zagnieżdżony `SortableContext` dla `children`:
```tsx
{element.children.length > 0 && isEditMode && (
  <SortableContext 
    items={element.children.map(c => c.id)} 
    strategy={verticalListSortingStrategy}
  >
    {element.children.map(child => (
      <DraggableHtmlElement key={child.id} element={child} ... />
    ))}
  </SortableContext>
)}
```

**Plik**: `src/components/admin/html-editor/HtmlElementRenderer.tsx`

Aktualizacja renderowania dzieci (linia 156-170) aby były draggable.

---

### Zmiana 5: Ulepszone wstawianie wideo wewnątrz kontenera

**Problem**: Przy zaznaczeniu kontenera i dodaniu wideo z menu "Więcej", element nie trafia do środka.

**Rozwiązanie** (już częściowo zaimplementowane w `addElement` - linia 247-283):
- Funkcja `addElement` obsługuje `position: 'inside'`
- Problem: menu "Więcej" zawsze używa domyślnej pozycji `'after'`

**Naprawa w HtmlElementToolbar.tsx**:
Dodać wizualne potwierdzenie wybranej pozycji i respektować ją przy dodawaniu:

```tsx
// Zmienić przycisk "Więcej" na DropdownMenu z opcjami pozycji
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm" className="h-8 gap-1">
      <Plus className="w-4 h-4" />
      <span className="hidden sm:inline">Więcej</span>
      {hasSelection && (
        <Badge variant="secondary" className="ml-1 text-[10px]">
          {insertPosition === 'inside' ? 'wewnątrz' : 
           insertPosition === 'before' ? 'przed' : 'po'}
        </Badge>
      )}
    </Button>
  </DropdownMenuTrigger>
  ...
</DropdownMenu>
```

---

## Zestawienie plików do modyfikacji

| Plik | Zmiana |
|------|--------|
| `EventCardCompact.tsx` | Zmiana rozmiaru miniaturek z `w-14 h-14` na `w-20 h-20` |
| `HtmlPagesManagement.tsx` | Powiększenie okna dialogowego edytora |
| `HtmlElementToolbar.tsx` | Naprawa menu pozycji wstawiania + stan `insertPosition` |
| `DraggableHtmlElement.tsx` | Dodanie zagnieżdżonego drag-and-drop dla dzieci |
| `HtmlHybridEditor.tsx` | Aktualizacja `handleDragEnd` dla zagnieżdżonych elementów |

---

## Oczekiwane rezultaty

1. **Miniaturki wydarzeń** będą większe (80x80px) i lepiej widoczne
2. **Okno edytora HTML** będzie zajmowało prawie cały ekran dla lepszej pracy
3. **Wstawianie elementów** będzie respektowało wybraną pozycję (przed/po/wewnątrz)
4. **Elementy wewnątrz kontenerów** będą obsługiwały drag-and-drop
5. **Podwójne kliknięcie** do edycji tekstu pozostanie bez zmian
