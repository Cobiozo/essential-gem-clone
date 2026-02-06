

# Plan: Naprawa layoutu edytora HTML - pełne wykorzystanie ekranu

## Zidentyfikowane problemy

### Problem 1: Dialog z ograniczoną wysokością
Dialog w `HtmlPagesManagement.tsx` używa `ScrollArea` wewnątrz zakładek, co powoduje dodatkowe ograniczenia wysokości. Na screenshocie widać:
- Panel boczny "Kontener" jest ucięty (nie widać pełnych opcji)
- Podgląd nie sięga dołu ekranu
- Przyciski "Anuluj" i "Zapisz" nachodzą na edytor

### Problem 2: Ograniczenia wysokości w HtmlHybridEditor
Linia 562 ustawia `max-h-[calc(100vh-200px)]` co w połączeniu z dialogiem powoduje podwójne ograniczenie.

### Problem 3: Properties Panel za wąski
Panel boczny ma `defaultSize={32}` z `minSize={25}` i `maxSize={45}`, co przy szerokości 95vw daje tylko ~30% ekranu - za mało dla panelu edycji.

---

## Rozwiązanie

### 1. Zmiana struktury dialogu (`HtmlPagesManagement.tsx`)

| Przed | Po |
|-------|-----|
| `ScrollArea` wewnątrz wszystkich zakładek | Usunięcie ScrollArea dla zakładki "preview" |
| `h-[calc(90vh-220px)]` dla preview | `h-full` z flex-grow |
| Statyczna wysokość | Elastyczna wysokość z `flex-1` |

**Zmiany w DialogContent:**
```tsx
<DialogContent className="max-w-[98vw] max-h-[95vh] h-[95vh] flex flex-col p-0">
```

**Usunięcie ScrollArea dla zakładki preview:**
```tsx
<TabsContent value="preview" className="flex-1 h-full overflow-hidden m-0 p-0">
  <HtmlHybridEditor ... />
</TabsContent>
```

### 2. Rozszerzenie panelu bocznego (`HtmlHybridEditor.tsx`)

| Parametr | Przed | Po |
|----------|-------|-----|
| `defaultSize` | 32 | 35 |
| `minSize` | 25 | 28 |
| `maxSize` | 45 | 50 |
| Panel główny `minSize` | 40 | 50 |

### 3. Optymalizacja wysokości edytora

```tsx
// Linia 562 - zmiana
<div className="h-full flex flex-col border rounded-lg overflow-hidden bg-background">
```

Usunięcie `min-h-[600px] max-h-[calc(100vh-200px)]` - niech edytor zajmuje całą dostępną przestrzeń przekazaną przez rodzica.

### 4. Lepsze zarządzanie flex-grow w zakładkach

```tsx
// TabsContent visual - pełna wysokość bez margin
<TabsContent value="visual" className="flex-1 h-0 min-h-0 overflow-hidden">
```

Użycie `h-0 min-h-0` z `flex-1` to standardowy pattern dla pełnego wypełnienia flexboxa.

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/HtmlPagesManagement.tsx` | Struktura DialogContent, usunięcie ScrollArea dla preview |
| `src/components/admin/html-editor/HtmlHybridEditor.tsx` | Usunięcie ograniczeń wysokości, szerszy panel |

---

## Szczegółowe zmiany

### HtmlPagesManagement.tsx

**Dialog (linia ~369-378):**
```tsx
<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
  <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0">
    <DialogHeader className="px-6 py-4 border-b shrink-0">
      ...
    </DialogHeader>

    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
      <TabsList className="grid w-full grid-cols-4 px-6 py-2 shrink-0">
        ...
      </TabsList>

      {/* Zakładki HTML i Ustawienia - z ScrollArea */}
      <ScrollArea className="flex-1">
        <TabsContent value="editor">...</TabsContent>
        <TabsContent value="settings">...</TabsContent>
        <TabsContent value="visibility">...</TabsContent>
      </ScrollArea>
      
      {/* Zakładka Podgląd - BEZ ScrollArea, pełna wysokość */}
      <TabsContent value="preview" className="flex-1 h-full overflow-hidden m-0 p-2">
        <HtmlHybridEditor ... />
      </TabsContent>
    </Tabs>

    <DialogFooter className="px-6 py-3 border-t shrink-0">
      ...
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### HtmlHybridEditor.tsx

**Główny kontener (linia 562):**
```tsx
<div className="h-full flex flex-col border rounded-lg overflow-hidden bg-background">
```

**ResizablePanel dla panelu właściwości (linia 698):**
```tsx
<ResizablePanel defaultSize={35} minSize={28} maxSize={50}>
```

**ResizablePanel główny (linia 639):**
```tsx
<ResizablePanel defaultSize={selectedElementId ? 65 : 100} minSize={50} className="h-full">
```

---

## Rezultat

- Edytor wypełnia 98% szerokości i 95% wysokości ekranu
- Panel boczny właściwości nie jest ucięty (szerszy o ~10%)
- Podgląd sięga dołu ekranu (bez podwójnych ScrollArea)
- Przyciski "Anuluj" i "Zapisz" są w stopce dialogu, nie nachodzą na edytor

