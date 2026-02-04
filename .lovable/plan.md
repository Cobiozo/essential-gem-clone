
# Plan: Stabilizacja edytora HTML - naprawa zamykania się podczas edycji

## Zdiagnozowane problemy

### Problem 1: Panel zamyka się po aktualizacji elementu
**Przyczyna:** `handleUpdate` wywołuje `setSelectedElement(updatedSelected)` z nowym obiektem po każdej zmianie. Jeśli `findElementById` zwróci `null` (np. z powodu asynchronicznej aktualizacji), panel się zamyka.

### Problem 2: Re-render całego drzewa elementów przy każdej zmianie
**Przyczyna:** `syncAndSave()` wywołuje `setElements(newElements)`, co powoduje pełny re-render wszystkich komponentów. To może powodować utratę focusu mimo `DebouncedStyleInput`.

### Problem 3: Utrata focusu na komponentach nieobjętych debounce
**Przyczyna:** Niektóre kontrolki (Slider, color input) nadal wywołują `updateStyle()` natychmiast (bez debounce), co powoduje pełny re-render.

---

## Rozwiązanie

### Zmiana 1: Zabezpieczenie `selectedElement` przed nullem

W `handleUpdate` dodam sprawdzenie, czy element nadal istnieje po aktualizacji:

```text
Plik: src/components/admin/html-editor/HtmlHybridEditor.tsx

handleUpdate:
  1. Po aktualizacji, NIE resetuj selectedElement jeśli nowy obiekt jest null
  2. Użyj referencji do ID zamiast całego obiektu
  3. Tylko aktualizuj styles/attributes w selectedElement, zachowując ID
```

### Zmiana 2: Lokalne zarządzanie stanem elementu w panelu

Panel właściwości będzie przechowywał **lokalną kopię elementu** zamiast bezpośrednio korzystać z props:

```text
Plik: src/components/admin/html-editor/SimplifiedPropertiesPanel.tsx

Nowa architektura:
  1. Lokalne state: const [localElement, setLocalElement] = useState(element)
  2. Zmiany stylów aktualizują LOKALNY stan (instant feedback)
  3. Debounced sync do parent (onUpdate) co 500ms lub onBlur
  4. useEffect synchronizuje lokalny stan gdy props.element.id się zmieni
```

### Zmiana 3: Stabilne ID zamiast pełnych obiektów

Zamiast przekazywać pełny obiekt `selectedElement`, będę używać stabilnego `selectedElementId`:

```text
Zmiany w HtmlHybridEditor:
  1. const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  2. selectedElement = useMemo(() => findElementById(elements, selectedElementId), [elements, selectedElementId])
  3. Panel dostaje element obliczony z memo - stabilny render
```

### Zmiana 4: Debounced onUpdate w panelu

Cały `onUpdate` z panelu będzie debounced na poziomie panelu:

```text
SimplifiedPropertiesPanel:
  1. Wszystkie zmiany (slider, color, input) aktualizują LOKALNY stan
  2. Jeden useEffect z debounce (500ms) wywołuje onUpdate
  3. Natychmiastowy wizualny feedback w panelu
  4. Brak re-renderów drzewa podczas edycji
```

---

## Szczegóły implementacji

### HtmlHybridEditor.tsx - Stabilne ID

```tsx
// Zmiana stanu - używaj ID zamiast pełnego obiektu
const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

// Oblicz element z memo dla stabilności
const selectedElement = useMemo(() => {
  if (!selectedElementId) return null;
  return findElementById(elements, selectedElementId);
}, [elements, selectedElementId, findElementById]);

// handleSelect używa ID
const handleSelect = useCallback((element: ParsedElement) => {
  setSelectedElementId(element.id);
  setEditingElementId(null);
}, []);

// handleUpdate NIE resetuje selekcji
const handleUpdate = useCallback((updates: Partial<ParsedElement>) => {
  if (!selectedElementId) return;
  
  const updatedElements = updateElementById(elements, selectedElementId, updates);
  syncAndSave(updatedElements);
  // NIE wywołuj setSelectedElementId - element zostaje wybrany
}, [elements, selectedElementId, updateElementById, syncAndSave]);

// handleDelete czyści ID
const handleDelete = useCallback(() => {
  if (!selectedElementId) return;
  
  const updatedElements = deleteElementById(elements, selectedElementId);
  syncAndSave(updatedElements);
  setSelectedElementId(null);  // Czyść po usunięciu
  setEditingElementId(null);
}, [elements, selectedElementId, deleteElementById, syncAndSave]);
```

### SimplifiedPropertiesPanel.tsx - Lokalne zarządzanie stanem

```tsx
export const SimplifiedPropertiesPanel: React.FC<Props> = ({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onClose,
}) => {
  // LOKALNA kopia elementu dla natychmiastowego feedbacku
  const [localStyles, setLocalStyles] = useState(element?.styles || {});
  const [localAttributes, setLocalAttributes] = useState(element?.attributes || {});
  const [localTextContent, setLocalTextContent] = useState(element?.textContent || '');
  
  const pendingUpdateRef = useRef<NodeJS.Timeout>();
  const elementIdRef = useRef(element?.id);
  
  // Sync gdy element.id się zmieni (nowy element wybrany)
  useEffect(() => {
    if (element?.id !== elementIdRef.current) {
      elementIdRef.current = element?.id;
      setLocalStyles(element?.styles || {});
      setLocalAttributes(element?.attributes || {});
      setLocalTextContent(element?.textContent || '');
    }
  }, [element?.id, element?.styles, element?.attributes, element?.textContent]);
  
  // Debounced sync do parent
  const scheduleUpdate = useCallback(() => {
    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current);
    }
    
    pendingUpdateRef.current = setTimeout(() => {
      onUpdate({
        styles: localStyles,
        attributes: localAttributes,
        textContent: localTextContent
      });
    }, 300);
  }, [localStyles, localAttributes, localTextContent, onUpdate]);
  
  // Lokalna aktualizacja stylu (natychmiastowa)
  const updateStyle = useCallback((key: string, value: string) => {
    setLocalStyles(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Trigger debounced update przy każdej zmianie
  useEffect(() => {
    scheduleUpdate();
    return () => {
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
      }
    };
  }, [localStyles, localAttributes, localTextContent]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
      }
    };
  }, []);
  
  // UI używa localStyles zamiast element.styles
  // np. <Slider value={[parseFloat(localStyles.width)]} ... />
};
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `HtmlHybridEditor.tsx` | Zmiana na `selectedElementId` + useMemo, stabilne handlery |
| `SimplifiedPropertiesPanel.tsx` | Lokalne state dla stylów/atrybutów z debounced sync |

---

## Oczekiwane rezultaty

1. **Panel NIE zamyka się** podczas edycji szerokości lub innych stylów
2. **Natychmiastowy feedback** - zmiany widoczne od razu w panelu
3. **Stabilne drzewo** - brak pełnych re-renderów podczas edycji
4. **Usunięcie działa poprawnie** - panel zamyka się tylko po kliknięciu "Usuń"
5. **Focus zachowany** - wszystkie pola input zachowują focus podczas pisania
