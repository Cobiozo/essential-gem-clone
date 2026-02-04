
# Plan: Naprawa krytycznych problemów edytora HTML

## Zidentyfikowane problemy

### Problem 1: Rozbieżność między edytorem a podglądem
**Przyczyna:** Edytor wizualny pokazuje elementy z opakowaniem (`<div className={wrapperClasses}>`) i dodatkowymi stylami (ring, cursor-pointer), podczas gdy podgląd/serializer używa czystego HTML z `codeValue`. Dodatkowo podgląd iframe używa `codeValue`, który jest aktualizowany z opóźnieniem lub może nie zawierać najnowszych zmian.

### Problem 2: Edytor resetuje się / zamyka panel po zmianach
**Przyczyna:** Mimo implementacji `selectedElementId` i lokalnego stanu w panelu, problem nadal występuje. Analiza kodu ujawnia:

1. **Niesynchronizowany lokalny stan** - `scheduleUpdate` w `SimplifiedPropertiesPanel` tworzy się przy każdej zmianie `localStyles`, co powoduje nieskończoną pętlę `useEffect → setLocalStyles → scheduleUpdate → useEffect`

2. **Brak izolacji useCallback** - `scheduleUpdate` jest w dependency array `useEffect`, ale sam zależy od `localStyles`, tworząc cykl

3. **Element props się zmieniają** - Gdy `syncAndSave()` wywołuje `setElements()`, React re-renderuje `findElementById(elements, selectedElementId)` z nowym obiektem elementu, co triggeruje sync w panelu

### Problem 3: Podgląd nie pokazuje zmian natychmiast
**Przyczyna:** `codeValue` jest aktualizowany w `useEffect` gdy `activeTab === 'visual'`, ale serializacja może następować przed zakończeniem sync. Podgląd iframe używa `codeValue` który może być stale o krok za rzeczywistym stanem `elements`.

---

## Rozwiązania

### Rozwiązanie 1: Usunięcie cyklicznych zależności w panelu

Problem jest w tych liniach `SimplifiedPropertiesPanel.tsx`:

```tsx
// PROBLEM: scheduleUpdate zależy od localStyles, a useEffect zależy od scheduleUpdate
const scheduleUpdate = useCallback(() => {...}, [localStyles, localAttributes, localTextContent, onUpdate]);

useEffect(() => {
  scheduleUpdate();  // <- To tworzy cykl!
}, [localStyles, localAttributes, localTextContent, scheduleUpdate]);
```

**Rozwiązanie:** Użyć `useRef` do przechowywania aktualnych wartości i usunąć zależności ze scheduleUpdate:

```tsx
// Przechowuj aktualne wartości w ref
const localStylesRef = useRef(localStyles);
const localAttributesRef = useRef(localAttributes);
const localTextContentRef = useRef(localTextContent);

// Aktualizuj ref przy każdej zmianie
useEffect(() => {
  localStylesRef.current = localStyles;
  localAttributesRef.current = localAttributes;
  localTextContentRef.current = localTextContent;
});

// scheduleUpdate BEZ zależności od lokalnych stanów
const scheduleUpdate = useCallback(() => {
  if (pendingUpdateRef.current) {
    clearTimeout(pendingUpdateRef.current);
  }
  
  pendingUpdateRef.current = setTimeout(() => {
    onUpdate({
      styles: localStylesRef.current,
      attributes: localAttributesRef.current,
      textContent: localTextContentRef.current
    });
  }, 300);
}, [onUpdate]); // Tylko onUpdate w dependencies!

// Prostszy useEffect - triggerowany tylko przez rzeczywiste zmiany
useEffect(() => {
  if (element?.id && elementIdRef.current === element.id) {
    scheduleUpdate();
  }
}, [localStyles, localAttributes, localTextContent, element?.id, scheduleUpdate]);
```

### Rozwiązanie 2: Natychmiastowa synchronizacja podglądu

Zamiast używać `codeValue` dla podglądu, obliczaj HTML bezpośrednio z `elements`:

```tsx
// W HtmlHybridEditor - oblicz podgląd HTML bezpośrednio z elements
const previewHtml = useMemo(() => {
  return serializeElementsToHtml(elements);
}, [elements]);

// Podgląd używa previewHtml zamiast codeValue
<iframe srcDoc={`...${previewHtml}...`} />
```

### Rozwiązanie 3: Zabezpieczenie przed resetem selekcji

Dodanie warunku w sync elementu - nie resetuj lokalnego stanu jeśli tylko style/attributes się zmieniły:

```tsx
// W SimplifiedPropertiesPanel - lepszy warunek sync
useEffect(() => {
  // TYLKO sync gdy element.id się zmienił (nowy element wybrany)
  // NIE sync gdy ten sam element ma nowe style (bo to my je zmieniliśmy)
  if (element?.id !== elementIdRef.current) {
    elementIdRef.current = element?.id;
    setLocalStyles(element?.styles || {});
    setLocalAttributes(element?.attributes || {});
    setLocalTextContent(element?.textContent || '');
  }
}, [element?.id]); // TYLKO element.id, nie element.styles!
```

### Rozwiązanie 4: Izolacja renderowania elementów

Dodanie `React.memo` do `HtmlElementRenderer` aby zapobiec niepotrzebnym re-renderom:

```tsx
export const HtmlElementRenderer = React.memo<HtmlElementRendererProps>(({
  element,
  // ...
}) => {
  // ...
}, (prevProps, nextProps) => {
  // Custom comparison - re-render tylko gdy naprawdę potrzebne
  return (
    prevProps.element.id === nextProps.element.id &&
    prevProps.selectedId === nextProps.selectedId &&
    prevProps.hoveredId === nextProps.hoveredId &&
    prevProps.editingId === nextProps.editingId &&
    JSON.stringify(prevProps.element.styles) === JSON.stringify(nextProps.element.styles)
  );
});
```

---

## Szczegóły implementacji

### Plik 1: SimplifiedPropertiesPanel.tsx

Kluczowe zmiany:
- Dodanie `useRef` dla lokalnych wartości
- Usunięcie cyklicznych zależności w `scheduleUpdate`
- Uproszczenie warunku sync (tylko `element?.id`)
- Dodanie flagi `isUpdatingRef` zapobiegającej podwójnym aktualizacjom

### Plik 2: HtmlHybridEditor.tsx

Kluczowe zmiany:
- Dodanie `previewHtml = useMemo(() => serializeElementsToHtml(elements), [elements])`
- Użycie `previewHtml` w iframe podglądu i w `openRealPreview`
- Synchronizacja `codeValue` tylko przy przełączaniu na zakładkę "code"

### Plik 3: HtmlElementRenderer.tsx

Kluczowe zmiany:
- Dodanie `React.memo` z custom comparator
- Izolacja re-renderów do faktycznie zmienionych elementów

---

## Diagram przepływu danych po naprawie

```text
Panel edycji (SimplifiedPropertiesPanel)
    │
    ├─ [1] Użytkownik zmienia style (slider, input)
    │       │
    │       └── setLocalStyles() ← Natychmiastowy feedback w panelu
    │           │
    │           └── useEffect triggeruje scheduleUpdate()
    │               │
    │               └── setTimeout(300ms)
    │                   │
    │                   └── [2] onUpdate() → HtmlHybridEditor
    │
HtmlHybridEditor
    │
    ├─ [3] handleUpdate() otrzymuje zmiany
    │       │
    │       └── updateElementById() → nowe elements
    │           │
    │           └── syncAndSave(newElements)
    │               │
    │               ├── setElements() → aktualizuje drzewo
    │               └── onChange() → zapisuje do parent
    │
    ├─ [4] useMemo(previewHtml) przelicza HTML
    │       │
    │       └── Podgląd iframe natychmiast pokazuje zmiany
    │
    └─ [5] Panel NIE resetuje się
            │
            └── element?.id nie zmienił się
                │
                └── useEffect sync NIE triggerowany
                    │
                    └── Lokalny stan pozostaje nietknięty
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `SimplifiedPropertiesPanel.tsx` | Naprawa cyklicznych zależności, izolacja aktualizacji |
| `HtmlHybridEditor.tsx` | Natychmiastowy podgląd z `useMemo`, sync `codeValue` |
| `HtmlElementRenderer.tsx` | `React.memo` z custom comparator |

---

## Oczekiwane rezultaty

1. **Podgląd identyczny z edytorem** - ten sam HTML, natychmiastowe odświeżanie
2. **Panel NIE zamyka się** - lokalne zmiany nie resetują selekcji
3. **Real-time feedback** - zmiany widoczne natychmiast
4. **Brak cyklicznych re-renderów** - stabilna wydajność
5. **Edycja płynna** - wpisywanie, slidery, kolory działają bez zacięć
