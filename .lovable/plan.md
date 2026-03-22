

# Poprawka podglądu + Drag & Drop dla plików w folderze

## 1. Poprawka podglądu (pełna strona z mapowaniem)

Komponent `PreviewWithMappings` zostanie przebudowany, aby odtwarzał scenę identyczną z edytorem mapowania:

- Stage o stałych proporcjach `842×595` (jak edytor), nie proporcjach naturalnego obrazu
- Tło renderowane w trybie `contain` wewnątrz stage z odpowiednimi marginesami (offsety X/Y)
- Elementy mapowania pozycjonowane względem stage `842×595`, a nie obrazu
- Skalowanie `fontSize` proporcjonalne do rozmiaru stage w przeglądarce
- Dialog z `max-w-[95vw]` i `ScrollArea` — brak ucinania

## 2. Drag & Drop dla plików w folderze (NOWE)

Pliki w gridzie będą przestawialne przez przeciąganie, z automatycznym zapisem nowej kolejności do bazy.

### Implementacja
- Import `DndContext`, `SortableContext`, `useSortable` z `@dnd-kit/core` i `@dnd-kit/sortable` (już w projekcie)
- Owinięcie siatki plików w `DndContext` + `SortableContext` z listą ID plików
- Każda karta pliku stanie się sortowalna (`useSortable`) z uchwytem `GripVertical`
- Strategia: `rectSortingStrategy` (grid) zamiast `verticalListSortingStrategy`
- `onDragEnd`: przeliczenie nowych `position` i batch update do `bp_page_files`
- Natychmiastowa aktualizacja stanu lokalnego (optymistyczny UI)
- Grid layout z `gridTemplateColumns` kompatybilny z dnd-kit (wymagane `rectSortingStrategy`)

### Handler `onDragEnd`
```text
1. Znajdź oldIndex i newIndex z active/over
2. arrayMove(files, oldIndex, newIndex)
3. Zaktualizuj stan lokalny natychmiast
4. Batch update position dla każdego pliku w tle
```

## Pliki do zmiany
- `src/components/admin/BpPageFilesManager.tsx` — oba zadania

