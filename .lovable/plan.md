

# Plan: Pełne wykorzystanie ekranu i lepsze chwytanie elementów

## Zidentyfikowane problemy

### Problem 1: Czarny/pusty obszar pod podglądem
- Linia 771: `items-start justify-center` - wyrównuje do góry zamiast rozciągać
- Linia 773-778: `h-full` w div, ale iframe w środku nie ma `h-full`
- Iframe używa `minHeight` zamiast pełnej wysokości

### Problem 2: Elementy poza obszarem - trudno chwycić
- Linia 87 w DraggableHtmlElement: `-left-6` umieszcza uchwyt poza widocznym obszarem
- Linia 641 w HtmlHybridEditor: `pl-8` to za mało miejsca na uchwyty

### Problem 3: W "Pełny podgląd" kliknięcie nie zaznacza elementu
- Tab "preview" renderuje iframe, który jest izolowany - kliknięcia nie są przekazywane do React
- Użytkownik oczekuje, że klik w podgląd zaznacza element do edycji

---

## Rozwiązanie

### 1. Pełne wykorzystanie wysokości w "Pełny podgląd" tab

```tsx
// Linia 771-816 - zmiana struktury
<TabsContent value="preview" className="flex-1 m-0 overflow-hidden flex flex-col">
  {/* Kontrolki responsywne */}
  <div className="... shrink-0">...</div>
  
  {/* Kontener iframe - pełna wysokość */}
  <div className="flex-1 bg-muted/20 flex justify-center overflow-hidden">
    <div 
      className="bg-white shadow-lg h-full"
      style={{ 
        width: previewWidth,
        maxWidth: '100%',
      }}
    >
      <iframe
        srcDoc={...}
        className="w-full h-full border-0"
        title="Podgląd strony"
      />
    </div>
  </div>
</TabsContent>
```

**Kluczowe zmiany:**
- Usunięcie `items-start` → iframe rozciąga się na pełną wysokość
- Usunięcie `py-4` i `minHeight` → nie ma pustej przestrzeni
- Kontener wewnętrzny: `h-full` zamiast obliczeń wysokości

### 2. Lepsze chwytanie elementów - więcej miejsca na uchwyty

```tsx
// HtmlHybridEditor.tsx linia 641
<div className="p-4 pl-10 min-h-full" ref={editableRef}>
```

**Zmiana `pl-8` na `pl-10`** - więcej miejsca dla uchwytów po lewej stronie.

### 3. Uchwyt bliżej elementu w DraggableHtmlElement

```tsx
// DraggableHtmlElement.tsx linia 82-88
<div 
  ref={setActivatorNodeRef}
  {...listeners}
  {...attributes}
  className={cn(
    "absolute z-20 cursor-grab active:cursor-grabbing",
    "p-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded shadow-sm",
    "opacity-0 group-hover:opacity-100 transition-opacity",
    (isSelected || isHovered) && "opacity-100",
    // Zmiana pozycji: bliżej elementu, lepiej widoczny
    depth === 0 ? "-left-8 top-1" : "-left-6 top-0"
  )}
  onClick={(e) => e.stopPropagation()}
>
  <GripVertical className="w-4 h-4 text-primary/70" />
</div>
```

**Zmiany:**
- Większy padding: `p-1` → `p-1.5`
- Kolorystyka: wyróżnienie kolorem primary zamiast szarego muted
- Pozycja: `-left-8 top-1` (w granicach `pl-10` kontenera)
- Ikona większa: `w-3.5 h-3.5` → `w-4 h-4`

### 4. "Pełny podgląd" z możliwością zaznaczania elementów

Zamiast izolowanego iframe, użyjemy **renderowania inline z trybem podglądu** (bez drag-drop, ale z zaznaczaniem):

```tsx
// Nowy stan w HtmlHybridEditor
const [previewClickToSelect, setPreviewClickToSelect] = useState(true);

// W TabsContent value="preview"
<TabsContent value="preview" className="flex-1 m-0 overflow-hidden flex flex-col">
  <div className="flex items-center justify-center gap-1 py-2 bg-muted/30 border-b shrink-0">
    {/* Responsywne kontrolki */}
    ...
    
    <div className="h-4 w-px bg-border mx-2" />
    
    {/* Toggle: klik zaznacza element */}
    <Button
      variant={previewClickToSelect ? 'default' : 'ghost'}
      size="sm"
      className="h-7 px-2 gap-1"
      onClick={() => setPreviewClickToSelect(!previewClickToSelect)}
      title="Kliknij element, aby go edytować"
    >
      <MousePointer className="w-3.5 h-3.5" />
      <span className="text-xs">Edytuj po kliknięciu</span>
    </Button>
  </div>
  
  <div className="flex-1 bg-muted/20 flex justify-center overflow-auto">
    <div 
      className="bg-white shadow-lg"
      style={{ width: previewWidth, maxWidth: '100%' }}
    >
      {previewClickToSelect ? (
        // Renderuj elementy z możliwością kliknięcia
        <div className="p-6">
          {elements.map((element) => (
            <HtmlElementRenderer
              key={element.id}
              element={element}
              selectedId={selectedElementId}
              hoveredId={hoveredId}
              onSelect={(el) => {
                handleSelect(el);
                setActiveTab('visual'); // Przełącz na edytor wizualny
              }}
              onHover={setHoveredId}
              isEditMode={false}
              showOutlines={false}
            />
          ))}
          {customCss && <style>{customCss}</style>}
        </div>
      ) : (
        // Czysty iframe bez interakcji
        <iframe srcDoc={...} className="w-full h-full" />
      )}
    </div>
  </div>
</TabsContent>
```

**Logika:**
- Toggle "Edytuj po kliknięciu" pozwala wybrać tryb
- Gdy włączony: elementy są renderowane inline, klik zaznacza i przełącza na tab "visual"
- Gdy wyłączony: czysty iframe jak dotychczas

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `HtmlHybridEditor.tsx` | Pełna wysokość preview, więcej miejsca na uchwyty, kliknięcie w podglądzie |
| `DraggableHtmlElement.tsx` | Lepiej widoczny uchwyt, wyróżniony kolorem |

---

## Rezultat

- **100% wysokości ekranu** wykorzystane dla podglądu - zero czarnego pola
- **Uchwyty widoczne i dostępne** - większe, kolorowe, w granicach widocznego obszaru
- **Klik w podgląd zaznacza element** - natychmiastowe przejście do edycji
- **Intuicyjny workflow**: zobaczysz stronę → kliknij co chcesz zmienić → edytuj w panelu

