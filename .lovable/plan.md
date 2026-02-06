

# Plan: Edytor HTML zgodny z Layout Editorem platformy

## Przegląd zmian

Przeprojektowanie edytora HTML tak, aby:
1. Podgląd rozciągał się do samego dołu (100% wysokości)
2. Przycisk pozwalał na konfigurację linku bezpośrednio w zakładce "Wygląd"
3. Layout był zgodny z istniejącym Layout Editorem platformy (stały panel boczny po lewej)

---

## 1. Naprawa pełnej wysokości podglądu

### Problem
Obecnie w `HtmlHybridEditor.tsx`:
- `overflow-y-auto` na kontenerze, ale wewnętrzny `min-h-full` nie rozciąga się
- Preview używa `overflow-auto` zamiast `overflow-hidden` + ScrollArea

### Rozwiązanie

```text
Linia 642: <div className="h-full overflow-y-auto">
Zmiana na:
<ScrollArea className="h-full">
  <div className="p-4 pl-10" ref={editableRef}>
    ...
  </div>
</ScrollArea>

Linia 788: flex-1 bg-muted/20 flex justify-center overflow-auto
Zmiana na:
flex-1 bg-muted/20 flex justify-center overflow-hidden

Linia 798: <div className="p-6 min-h-full">
Zmiana na:
<ScrollArea className="h-full">
  <div className="p-6">...</div>
</ScrollArea>
```

---

## 2. Konfiguracja linku dla przycisku w zakładce "Wygląd"

### Problem
Opcje linku dla przycisku są ukryte w zakładce "Treść". Użytkownik nie może ich znaleźć.

### Rozwiązanie
W `SimplifiedPropertiesPanel.tsx`, po sekcji "Efekty" (linia ~445), dodać sekcję "Akcja przycisku" dla elementów typu button:

```tsx
{/* Button Action Section - directly in Style tab for visibility */}
{elementType === 'button' && (
  <Section title="Akcja przycisku" icon={<Link className="w-4 h-4" />}>
    <div className="space-y-3">
      {/* Link type selector */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Typ akcji</Label>
        <Select 
          value={localAttributes['data-link-type'] || 'external'} 
          onValueChange={(v) => updateAttribute('data-link-type', v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Wybierz typ..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="external">Link zewnętrzny</SelectItem>
            <SelectItem value="internal">Strona wewnętrzna</SelectItem>
            <SelectItem value="download">Pobierz plik</SelectItem>
            <SelectItem value="copy">Kopiuj do schowka</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* URL / Plik do pobrania / Tekst do skopiowania */}
      {/* ... pozostała konfiguracja linku ... */}
    </div>
  </Section>
)}
```

To zduplikowanie kodu z zakładki "Treść" zapewni widoczność opcji linku bezpośrednio po zaznaczeniu przycisku.

---

## 3. Upodobnienie do Layout Editora

### Aktualny Layout Editor (LivePreviewEditor):
```text
┌──────────────────────────────────────────────────────┐
│  Fixed sidebar (w-96)  │  Main content (ml-96)      │
│  ┌──────────────────┐  │  ┌────────────────────────┐│
│  │ "Elementy"       │  │  │ Podgląd strony         ││
│  │  - Widżety       │  │  │                        ││
│  │  - Globalne      │  │  │                        ││
│  │                  │  │  │                        ││
│  │ [Lista elementów]│  │  │                        ││
│  │ do przeciągnięcia│  │  └────────────────────────┘│
│  └──────────────────┘  │                            │
└──────────────────────────────────────────────────────┘
```

### Propozycja dla edytora HTML:
```text
┌─────────────────────────────────────────────────────────────┐
│ Header: Powrót | Tytuł strony | [Edytor] [Ustawienia] | Zapisz │
├─────────────────────────────────────────────────────────────┤
│  Lewy panel (w-80)    │  Podgląd + Panel właściwości (flex-1)│
│  ┌─────────────────┐  │  ┌───────────────────┬─────────────┐│
│  │ "Elementy"      │  │  │ Podgląd HTML      │ Właściwości ││
│  │  [Nagłówek]     │  │  │ (h-full)          │ (po zaznacz)││
│  │  [Paragraf]     │  │  │                   │             ││
│  │  [Obrazek]      │  │  │                   │             ││
│  │  [Przycisk]     │  │  │                   │             ││
│  │  [Wideo]        │  │  │                   │             ││
│  │  [Sekcja]       │  │  │                   │             ││
│  │  [Więcej...]    │  │  │                   │             ││
│  └─────────────────┘  │  └───────────────────┴─────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Implementacja

#### A. Nowy komponent `HtmlElementsPanel.tsx`
Oparty na `ElementsPanel.tsx`, ale uproszczony dla HTML:

```tsx
// src/components/admin/html-editor/HtmlElementsPanel.tsx
const HtmlElementsPanel = ({ onAddElement, className }) => {
  const categories = [
    {
      id: 'basic',
      title: 'Podstawowe (13)',
      items: [
        { id: 'heading', title: 'Nagłówek', icon: <Type />, html: '<h2>...</h2>' },
        { id: 'image', title: 'Obrazek', icon: <Image />, html: '<img ... />' },
        { id: 'text', title: 'Edytor tekstu', icon: <AlignLeft />, html: '<p>...</p>' },
        { id: 'video', title: 'Film', icon: <Video />, html: '<video>...</video>' },
        { id: 'button', title: 'Przycisk', icon: <MousePointer2 />, html: '<button>...</button>' },
        // ... dalsze elementy z HtmlElementToolbar
      ]
    }
  ];
  
  return (
    <Card className="w-80 h-full border-r flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-bold">Elementy</h2>
      </div>
      <Tabs defaultValue="widgets">
        <TabsList>
          <TabsTrigger value="widgets">Widżety</TabsTrigger>
          <TabsTrigger value="global">Globalne</TabsTrigger>
        </TabsList>
        <TabsContent value="widgets">
          <ScrollArea>
            {categories.map(cat => (
              <CollapsibleSection key={cat.id} title={cat.title}>
                <div className="grid grid-cols-2 gap-2">
                  {cat.items.map(item => (
                    <Button
                      key={item.id}
                      variant="outline"
                      className="flex-col h-auto py-3"
                      onClick={() => onAddElement(item.html)}
                    >
                      {item.icon}
                      <span className="text-xs">{item.title}</span>
                    </Button>
                  ))}
                </div>
              </CollapsibleSection>
            ))}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
```

#### B. Zmiana layoutu w `HtmlHybridEditor.tsx`

```tsx
// Nowa struktura główna
<div className="h-full flex overflow-hidden">
  {/* Lewy panel - Elementy */}
  <div className="w-80 shrink-0 border-r h-full">
    <HtmlElementsPanel onAddElement={addElement} />
  </div>
  
  {/* Główny obszar - Podgląd + Właściwości */}
  <div className="flex-1 flex flex-col overflow-hidden">
    {/* Toolbar - kompaktowy */}
    <div className="shrink-0 border-b flex items-center gap-2 px-2 py-1">
      {/* Undo/Redo, Tryb edycji, Kontury itp. */}
    </div>
    
    {/* Tabs: Edytor wizualny, Kod, Pełny podgląd */}
    <Tabs className="flex-1 flex flex-col overflow-hidden">
      <TabsList className="shrink-0">...</TabsList>
      
      <TabsContent value="visual" className="flex-1 h-0 min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Podgląd */}
          <ResizablePanel defaultSize={selectedElementId ? 65 : 100}>
            <ScrollArea className="h-full">
              <div className="p-4 pl-10">
                {/* Elementy z DnD */}
              </div>
            </ScrollArea>
          </ResizablePanel>
          
          {/* Panel właściwości */}
          {selectedElementId && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={35}>
                <SimplifiedPropertiesPanel ... />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </TabsContent>
    </Tabs>
  </div>
</div>
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/html-editor/HtmlHybridEditor.tsx` | Nowy layout z lewym panelem, pełna wysokość |
| `src/components/admin/html-editor/SimplifiedPropertiesPanel.tsx` | Sekcja "Akcja przycisku" w zakładce Wygląd |
| `src/components/admin/html-editor/HtmlElementsPanel.tsx` | **Nowy plik** - panel elementów wzorowany na ElementsPanel |

---

## Szczegóły techniczne

### HtmlHybridEditor.tsx - kluczowe zmiany

1. **Import `ScrollArea`** (jeśli jeszcze nie ma)
2. **Nowa struktura flex**:
   - Główny kontener: `h-full flex overflow-hidden`
   - Lewy panel: `w-80 shrink-0 border-r h-full`
   - Prawy obszar: `flex-1 flex flex-col overflow-hidden`
3. **Usunięcie `HtmlElementToolbar`** z górnego paska - przeniesione do lewego panelu
4. **ScrollArea** zamiast `overflow-y-auto` dla prawidłowego rozciągania

### SimplifiedPropertiesPanel.tsx - dodanie sekcji

Po linii ~445 (po sekcji "Efekty"), dodać:

```tsx
{/* Button Action - visible directly in Style tab */}
{elementType === 'button' && (
  <Section title="Akcja przycisku" icon={<Link className="w-4 h-4" />}>
    {/* Kopia kodu z linii 776-870 */}
  </Section>
)}
```

### HtmlElementsPanel.tsx - nowy plik

Elementy pobrane z `HtmlElementToolbar.tsx` (linia 51-233), ale renderowane jako siatka przycisków zamiast dropdown menu.

---

## Rezultat końcowy

- **Pełna wysokość ekranu** - podgląd rozciąga się do dołu bez pustych miejsc
- **Widoczne opcje linku** - sekcja "Akcja przycisku" bezpośrednio w zakładce Wygląd
- **Spójny UI** - layout zgodny z Layout Editorem platformy (lewy panel z elementami)
- **Intuicyjne dodawanie** - kliknięcie na element w lewym panelu dodaje go do strony

