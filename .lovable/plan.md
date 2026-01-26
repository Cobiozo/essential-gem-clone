

# Plan: Miniaturki i szybkie akcje dla grafik w panelu administracyjnym

## Cel

Rozbudować widok listy grafik o:
1. **Miniaturki** - podgląd każdej grafiki w formie małego obrazka
2. **Szybkie przyciski akcji** - ikony do włączania/wyłączania: Udostępnianie, Kopiowanie, Pobieranie

## Obecny stan

Aktualnie lista grafik używa tej samej funkcji `renderResourceCard()` co dokumenty - pokazuje tylko tekst (tytuł, badge'e, kategorię) bez podglądu obrazu i bez szybkich przełączników.

---

## Sekcja techniczna

### Zmiana: `src/components/admin/KnowledgeResourcesManagement.tsx`

#### 1. Nowa funkcja do szybkiego przełączania akcji

```typescript
// Quick toggle for individual resource actions (used in graphics list)
const handleQuickActionToggle = async (
  resourceId: string, 
  field: 'allow_share' | 'allow_copy_link' | 'allow_download',
  currentValue: boolean
) => {
  const { error } = await supabase
    .from('knowledge_resources')
    .update({ [field]: !currentValue })
    .eq('id', resourceId);
  
  if (error) {
    toast({ title: t('toast.error'), description: 'Nie udało się zaktualizować', variant: 'destructive' });
  } else {
    // Update local state optimistically
    setResources(prev => prev.map(r => 
      r.id === resourceId ? { ...r, [field]: !currentValue } : r
    ));
  }
};
```

#### 2. Nowa funkcja renderująca kartę grafiki z miniaturką

```typescript
// Render graphic card with thumbnail and quick actions
const renderGraphicCard = (resource: KnowledgeResource) => (
  <Card key={resource.id} className="hover:shadow-md transition-shadow">
    <CardContent className="py-4">
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted border">
          {resource.source_url ? (
            <img 
              src={resource.source_url} 
              alt={resource.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileImage className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold truncate">{resource.title}</h3>
            {resource.is_featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
            {resource.is_new && <Badge className="bg-blue-500/20 text-blue-700">Nowy</Badge>}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
            {resource.description || 'Brak opisu'}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {getTypeBadge(resource.resource_type)}
            {getStatusBadge(resource.status)}
            {resource.category && <Badge variant="secondary">{resource.category}</Badge>}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Download className="h-3 w-3" />
              {resource.download_count}
            </span>
          </div>
        </div>
        
        {/* Quick Actions - toggle buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant={resource.allow_share ? "default" : "ghost"}
            size="icon"
            className={`h-8 w-8 ${resource.allow_share ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'text-muted-foreground'}`}
            onClick={() => handleQuickActionToggle(resource.id, 'allow_share', resource.allow_share)}
            title="Udostępnianie"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            variant={resource.allow_copy_link ? "default" : "ghost"}
            size="icon"
            className={`h-8 w-8 ${resource.allow_copy_link ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'text-muted-foreground'}`}
            onClick={() => handleQuickActionToggle(resource.id, 'allow_copy_link', resource.allow_copy_link)}
            title="Kopiuj link"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant={resource.allow_download ? "default" : "ghost"}
            size="icon"
            className={`h-8 w-8 ${resource.allow_download ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'text-muted-foreground'}`}
            onClick={() => handleQuickActionToggle(resource.id, 'allow_download', resource.allow_download)}
            title="Pobieranie"
          >
            <Download className="h-4 w-4" />
          </Button>
          
          {/* Separator */}
          <div className="w-px h-6 bg-border mx-1" />
          
          {/* Edit/Delete */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(resource)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(resource.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);
```

#### 3. Użycie nowej funkcji w zakładce "Grafiki"

W sekcji TabsContent dla grafik:

```typescript
<TabsContent value="graphics" className="space-y-4">
  {renderFilters(false)}
  
  {loading ? (
    <div className="text-center py-8">
      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
    </div>
  ) : filteredGraphics.length === 0 ? (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Brak grafik do wyświetlenia</p>
      </CardContent>
    </Card>
  ) : (
    <div className="space-y-2">
      {filteredGraphics.map(renderGraphicCard)}  {/* <-- użycie nowej funkcji */}
    </div>
  )}
</TabsContent>
```

---

## Wizualizacja końcowa

```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│ [🖼] [HEART&ENERGY-relacje1]  [Nowy]                    [📤][📋][⬇] │ [✏][🗑] │
│      Brak opisu                                                                    │
│      [Grafika] [Aktywny] [Grafiki produktów EQ]  ⬇ 0  v1.0                        │
├────────────────────────────────────────────────────────────────────────────────────┤
│ [🖼] [HEART&ENERGY-relacje2]  [Nowy]                    [📤][📋][⬇] │ [✏][🗑] │
│      Brak opisu                                                                    │
│      [Grafika] [Aktywny] [Grafiki produktów EQ]  ⬇ 0  v1.0                        │
└────────────────────────────────────────────────────────────────────────────────────┘

Legenda:
[🖼] = miniaturka 80x80px
[📤] = Udostępnianie (podświetlone gdy włączone)
[📋] = Kopiuj link (podświetlone gdy włączone)
[⬇] = Pobieranie (podświetlone gdy włączone)
[✏] = Edytuj
[🗑] = Usuń
```

---

## Podsumowanie zmian

| Element | Zmiana |
|---------|--------|
| Miniaturka | Obrazek 80x80px po lewej stronie karty |
| Szybkie akcje | 3 przyciski (Share, Copy, Download) z wizualnym stanem włączony/wyłączony |
| Optymistyczna aktualizacja | Natychmiastowa zmiana w UI bez czekania na odpowiedź serwera |
| Dokumenty | Bez zmian - zachowują obecny wygląd |

## Korzyści

- **Szybki podgląd** - od razu widać jak wygląda grafika
- **Błyskawiczna edycja akcji** - jedno kliknięcie zamiast otwierania dialogu
- **Wizualny feedback** - przyciski podświetlone gdy akcja włączona
- **Optymistyczna aktualizacja** - brak opóźnienia w UI

