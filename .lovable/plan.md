

# Plan: Funkcja masowych akcji dla wszystkich grafik

## Cel

Dodanie funkcji "Zastosuj dla wszystkich" w zakładce Grafiki, która pozwoli jednym kliknięciem:
- Włączyć/wyłączyć udostępnianie dla wszystkich grafik
- Włączyć/wyłączyć kopiowanie linku dla wszystkich grafik  
- Włączyć/wyłączyć pobieranie dla wszystkich grafik

## Obecny stan

Aktualnie można przełączać akcje tylko pojedynczo dla każdej grafiki za pomocą przycisków przy każdym elemencie. Przy 123 grafikach zmiana ustawień dla wszystkich wymaga 123 kliknięć.

---

## Sekcja techniczna

### Modyfikacja: `src/components/admin/KnowledgeResourcesManagement.tsx`

#### 1. Nowy stan dla dialogu masowych akcji

```typescript
const [bulkActionsDialogOpen, setBulkActionsDialogOpen] = useState(false);
const [applyingBulkActions, setApplyingBulkActions] = useState(false);
```

#### 2. Funkcja do masowej aktualizacji akcji

```typescript
const handleBulkActionsApply = async (
  field: 'allow_share' | 'allow_copy_link' | 'allow_download',
  newValue: boolean
) => {
  setApplyingBulkActions(true);
  
  // Pobierz IDs wszystkich grafik (przefiltrowanych lub wszystkich)
  const graphicIds = filteredGraphics.map(r => r.id);
  
  if (graphicIds.length === 0) {
    toast({ title: t('toast.warning'), description: 'Brak grafik do aktualizacji' });
    setApplyingBulkActions(false);
    return;
  }
  
  const { error } = await supabase
    .from('knowledge_resources')
    .update({ [field]: newValue })
    .in('id', graphicIds);
  
  if (error) {
    toast({ title: t('toast.error'), description: 'Nie udało się zaktualizować grafik', variant: 'destructive' });
  } else {
    // Aktualizuj lokalny stan
    setResources(prev => prev.map(r => 
      graphicIds.includes(r.id) ? { ...r, [field]: newValue } : r
    ));
    toast({ 
      title: t('toast.success'), 
      description: `Zaktualizowano ${graphicIds.length} grafik` 
    });
  }
  
  setApplyingBulkActions(false);
};
```

#### 3. Nowy pasek masowych akcji nad listą grafik

Dodanie paska z przyciskami "Zastosuj dla wszystkich" pod filtrami w zakładce Grafiki:

```typescript
{/* Bulk actions bar - pokazuj tylko w zakładce grafiki gdy są jakieś grafiki */}
{filteredGraphics.length > 0 && (
  <Card>
    <CardContent className="py-3">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-sm text-muted-foreground font-medium">
          Zastosuj dla wszystkich ({filteredGraphics.length}):
        </span>
        
        {/* Udostępnianie */}
        <div className="flex items-center gap-1">
          <Share2 className="h-4 w-4 text-muted-foreground" />
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => handleBulkActionsApply('allow_share', true)}
            disabled={applyingBulkActions}
          >
            <Check className="h-3 w-3 mr-1" />
            Włącz
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => handleBulkActionsApply('allow_share', false)}
            disabled={applyingBulkActions}
          >
            <X className="h-3 w-3 mr-1" />
            Wyłącz
          </Button>
        </div>
        
        <div className="w-px h-6 bg-border" />
        
        {/* Kopiowanie linku */}
        <div className="flex items-center gap-1">
          <Copy className="h-4 w-4 text-muted-foreground" />
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => handleBulkActionsApply('allow_copy_link', true)}
            disabled={applyingBulkActions}
          >
            <Check className="h-3 w-3 mr-1" />
            Włącz
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => handleBulkActionsApply('allow_copy_link', false)}
            disabled={applyingBulkActions}
          >
            <X className="h-3 w-3 mr-1" />
            Wyłącz
          </Button>
        </div>
        
        <div className="w-px h-6 bg-border" />
        
        {/* Pobieranie */}
        <div className="flex items-center gap-1">
          <Download className="h-4 w-4 text-muted-foreground" />
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => handleBulkActionsApply('allow_download', true)}
            disabled={applyingBulkActions}
          >
            <Check className="h-3 w-3 mr-1" />
            Włącz
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => handleBulkActionsApply('allow_download', false)}
            disabled={applyingBulkActions}
          >
            <X className="h-3 w-3 mr-1" />
            Wyłącz
          </Button>
        </div>
        
        {applyingBulkActions && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
      </div>
    </CardContent>
  </Card>
)}
```

#### 4. Umiejscowienie paska w TabsContent grafik

Pasek zostanie dodany między filtrami a listą grafik:

```typescript
<TabsContent value="graphics" className="space-y-4">
  {renderFilters(false)}
  
  {/* NEW: Bulk actions bar */}
  {!loading && filteredGraphics.length > 0 && (
    <Card>
      <CardContent className="py-3">
        {/* ... przyciski masowych akcji ... */}
      </CardContent>
    </Card>
  )}
  
  {loading ? (
    <div className="text-center py-8">
      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
    </div>
  ) : filteredGraphics.length === 0 ? (
    /* ... empty state ... */
  ) : (
    <div className="space-y-2">
      {filteredGraphics.map(resource => renderGraphicCard(resource))}
    </div>
  )}
</TabsContent>
```

---

## Wizualizacja końcowa

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Dokumenty (15)]  [Grafiki (123)]                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Szukaj...]              [Wszystkie ▼]  [Wszystkie kategorie ▼]          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Zastosuj dla wszystkich (123):                                              │
│                                                                             │
│   📤 [✓ Włącz] [✗ Wyłącz]  │  📋 [✓ Włącz] [✗ Wyłącz]  │  ⬇ [✓ Włącz] [✗ Wyłącz] │
│   (Udostępnianie)             (Kopiuj link)               (Pobieranie)      │
├─────────────────────────────────────────────────────────────────────────────┤
│ [🖼] Logo Pure Life Team   [Nowy]              [📤] [📋] [⬇] │ [✏][🗑]     │
│ [🖼] HEART&ENERGY-relacje1 [Nowy]              [📤] [📋] [⬇] │ [✏][🗑]     │
│ ...                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Podsumowanie zmian

| Element | Zmiana |
|---------|--------|
| Nowy stan | `applyingBulkActions` - blokowanie przycisków podczas aktualizacji |
| Nowa funkcja | `handleBulkActionsApply` - masowa aktualizacja w Supabase |
| Nowy pasek UI | Przyciski "Włącz/Wyłącz" dla każdej akcji (Share, Copy, Download) |
| Filtrowanie | Masowe akcje działają na **przefiltrowanych** grafikach |

## Kluczowe cechy

- **Działanie na przefiltrowanych** - jeśli wybrałeś kategorię "Social media", akcje zostaną zastosowane tylko dla tej kategorii
- **Optymistyczna aktualizacja** - lokalny stan aktualizuje się natychmiast
- **Feedback dla użytkownika** - toast z liczbą zaktualizowanych grafik
- **Loader podczas aktualizacji** - przyciski są zablokowane i widoczny jest spinner

