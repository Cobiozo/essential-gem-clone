
# Plan: Rozdzielenie dokumentów i grafik w panelu administracyjnym Biblioteki

## Obecny stan

| Widok | Struktura |
|-------|-----------|
| Panel użytkownika (`KnowledgeCenter.tsx`) | Posiada zakładki "Dokumenty edukacyjne" i "Grafiki do udostępniania" |
| Panel admina (`KnowledgeResourcesManagement.tsx`) | Jedna wspólna lista wszystkich zasobów |

## Cel zmiany

Rozdzielić widok administracyjny na **dwie zakładki**:
- **Dokumenty** - wszystkie zasoby gdzie `resource_type !== 'image'`
- **Grafiki** - zasoby gdzie `resource_type === 'image'`

Każda zakładka będzie miała własne filtry kategorii dopasowane do typu zasobu.

---

## Sekcja techniczna

### Modyfikacja: `src/components/admin/KnowledgeResourcesManagement.tsx`

#### 1. Nowy stan dla aktywnej zakładki

```typescript
const [activeTab, setActiveTab] = useState<'documents' | 'graphics'>('documents');
```

#### 2. Rozdzielenie zasobów na dokumenty i grafiki

```typescript
// Split resources into documents and graphics (jak w KnowledgeCenter.tsx)
const documentResources = resources.filter(r => r.resource_type !== 'image');
const graphicsResources = resources.filter(r => r.resource_type === 'image');
```

#### 3. Osobne filtrowanie dla każdej sekcji

```typescript
// Filter documents
const filteredDocuments = documentResources.filter(r => {
  const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
  const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
  const matchesLanguage = filterLanguage === 'all' || 
    (filterLanguage === 'universal' ? r.language_code === null : r.language_code === filterLanguage);
  return matchesSearch && matchesStatus && matchesCategory && matchesLanguage;
});

// Filter graphics
const filteredGraphics = graphicsResources.filter(r => {
  const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
  const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
  return matchesSearch && matchesStatus && matchesCategory;
});
```

#### 4. Zakładki główne (Dokumenty / Grafiki)

```typescript
<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'documents' | 'graphics')}>
  <TabsList>
    <TabsTrigger value="documents" className="flex items-center gap-2">
      <FileText className="h-4 w-4" />
      Dokumenty ({filteredDocuments.length})
    </TabsTrigger>
    <TabsTrigger value="graphics" className="flex items-center gap-2">
      <Images className="h-4 w-4" />
      Grafiki ({filteredGraphics.length})
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="documents">
    {/* Filtry + lista dokumentów */}
  </TabsContent>
  
  <TabsContent value="graphics">
    {/* Filtry + lista/siatka grafik */}
  </TabsContent>
</Tabs>
```

#### 5. Dynamiczne kategorie w filtrze

Kategorie w filtrze będą zależeć od aktywnej zakładki:

```typescript
// W sekcji filtrów
<Select value={filterCategory} onValueChange={setFilterCategory}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Kategoria" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Wszystkie kategorie</SelectItem>
    {(activeTab === 'graphics' ? GRAPHICS_CATEGORIES : DOCUMENT_CATEGORIES).map(cat => (
      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### 6. Przeniesienie przycisków do nagłówka zakładek

- Przycisk "Dodaj wiele grafik" - widoczny **tylko w zakładce Grafiki**
- Przycisk "Dodaj zasób" - widoczny w obu zakładkach, ale przy dodawaniu z zakładki Grafiki automatycznie ustawia `resource_type: 'image'`

```typescript
<div className="flex items-center justify-between flex-wrap gap-2">
  <h2 className="text-2xl font-bold">Biblioteka</h2>
  <div className="flex gap-2">
    {activeTab === 'graphics' && (
      <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
        <Images className="h-4 w-4 mr-2" />
        Dodaj wiele grafik
      </Button>
    )}
    <Button onClick={() => openEditDialog(undefined, activeTab === 'graphics')}>
      <Plus className="h-4 w-4 mr-2" />
      {activeTab === 'graphics' ? 'Dodaj grafikę' : 'Dodaj dokument'}
    </Button>
  </div>
</div>
```

#### 7. Modyfikacja funkcji `openEditDialog`

```typescript
const openEditDialog = (resource?: KnowledgeResource, isGraphic?: boolean) => {
  if (resource) {
    setEditingResource(resource);
    setTagsInput(resource.tags?.join(', ') || '');
  } else {
    setEditingResource({ 
      ...emptyResource,
      resource_type: isGraphic ? 'image' : 'pdf'  // Domyślny typ zależny od zakładki
    });
    setTagsInput('');
  }
  setDialogOpen(true);
};
```

#### 8. Reset filtra kategorii przy zmianie zakładki

```typescript
// useEffect przy zmianie zakładki
useEffect(() => {
  setFilterCategory('all'); // Reset kategorii przy przełączeniu
}, [activeTab]);
```

---

## Struktura wizualna po zmianach

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Biblioteka                                    [Dodaj wiele grafik] [+Dodaj] │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐ ┌─────────────────────┐                            │
│  │ 📄 Dokumenty (15)   │ │ 🖼️ Grafiki (8)      │                            │
│  └─────────────────────┘ └─────────────────────┘                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  [🔍 Szukaj...]  [Status ▼]  [Kategoria ▼]  [Język ▼]                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Lista dokumentów LUB siatka grafik (zależnie od zakładki)                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Podsumowanie zmian

| Element | Zmiana |
|---------|--------|
| Zakładki główne | Nowe: "Dokumenty" i "Grafiki" z licznikiem |
| Filtry kategorii | Dynamicznie zależne od zakładki (`DOCUMENT_CATEGORIES` vs `GRAPHICS_CATEGORIES`) |
| Przycisk "Dodaj wiele grafik" | Widoczny tylko w zakładce Grafiki |
| Przycisk "Dodaj" | Tekst i domyślny typ zależny od zakładki |
| Lista zasobów | Osobna dla każdej zakładki |

## Zachowana funkcjonalność

- Wszystkie filtry działają jak dotychczas
- Edycja i usuwanie zasobów bez zmian
- Masowe dodawanie grafik bez zmian
- Dialog edycji z zakładkami (basic/source/visibility/actions/badges) bez zmian
