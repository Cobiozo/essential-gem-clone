
# Plan: Naprawa funkcji okładek wideo w module "Zdrowa Wiedza"

## Zidentyfikowane problemy

### 1. Okładki nie są wyświetlane w panelu admina
W tabeli z listą materiałów (linie 368-386) pokazywana jest tylko ikona typu (Play, Image, Document...), bez miniatury okładki.

### 2. Brakuje inicjalizacji pola thumbnail_url
Przy tworzeniu nowego materiału (linie 126-144) obiekt domyślny nie zawiera pola `thumbnail_url: null`, co może powodować problemy z zapisem.

### 3. Partner view - działa poprawnie
Widok partnera (linie 267-284) już obsługuje `thumbnail_url` - wyświetla okładkę jeśli istnieje.

---

## Zmiany do wdrożenia

### Plik: `src/components/admin/HealthyKnowledgeManagement.tsx`

#### Zmiana 1: Dodanie `thumbnail_url` do inicjalizacji nowego materiału

```text
Linie 126-144 (handleCreateNew)
```

Dodać pole `thumbnail_url: null` do domyślnego obiektu nowego materiału.

#### Zmiana 2: Wyświetlanie okładki w tabeli admin

```text
Linie 368-386 (TableCell z materiałem)
```

Zamienić prostą ikonę na miniaturkę okładki z play overlay:

**Przed:**
```tsx
<div className={cn("p-2 rounded-lg", ...)}>
  <ContentTypeIcon type={material.content_type} className="w-4 h-4" />
</div>
```

**Po:**
```tsx
<div className="relative w-12 h-10 rounded-lg overflow-hidden flex-shrink-0">
  {material.thumbnail_url ? (
    <>
      <img 
        src={material.thumbnail_url} 
        alt={material.title}
        className="w-full h-full object-cover"
      />
      {material.content_type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Play className="w-4 h-4 text-white" />
        </div>
      )}
    </>
  ) : (
    <div className={cn(
      "w-full h-full flex items-center justify-center",
      material.content_type === 'video' && "bg-blue-500/10 text-blue-500",
      material.content_type === 'audio' && "bg-purple-500/10 text-purple-500",
      // ...other types
    )}>
      <ContentTypeIcon type={material.content_type} className="w-5 h-5" />
    </div>
  )}
</div>
```

---

## Wizualizacja zmiany w panelu admina

```text
PRZED (tylko ikona):
┌─────────────────────────────────────────────────────────────┐
│ Materiał                    │ Typ    │ Kategoria │ Status  │
├─────────────────────────────────────────────────────────────┤
│ [▶] Sekretne działanie...   │ Wideo  │ Zdrowie   │ Aktywny │
│ [▶] Rola kwasów omega-3...  │ Wideo  │ Zdrowie   │ Aktywny │
└─────────────────────────────────────────────────────────────┘

PO (miniaturka z play overlay):
┌─────────────────────────────────────────────────────────────┐
│ Materiał                    │ Typ    │ Kategoria │ Status  │
├─────────────────────────────────────────────────────────────┤
│ [IMG▶] Sekretne działanie...│ Wideo  │ Zdrowie   │ Aktywny │
│ [IMG▶] Rola kwasów omega-3..│ Wideo  │ Zdrowie   │ Aktywny │
└─────────────────────────────────────────────────────────────┘
```

---

## Efekt końcowy

1. Okładki będą poprawnie zapisywane przy tworzeniu nowych materiałów
2. W panelu admina miniaturki będą widoczne obok tytułu materiału
3. Dla wideo z okładką - wyświetlana będzie okładka z nałożoną ikoną play
4. Dla materiałów bez okładki - wyświetlana będzie kolorowa ikona typu (jak dotychczas)
5. Partner view pozostaje bez zmian - już działa poprawnie

---

## Sekcja techniczna

### Zmiana w handleCreateNew (linie 126-144)

```typescript
const handleCreateNew = () => {
  setEditingMaterial({
    title: '',
    description: '',
    slug: '',
    content_type: 'document',
    thumbnail_url: null,  // <-- DODANE
    media_url: null,      // <-- DODANE dla kompletności
    visible_to_admin: true,
    visible_to_partner: false,
    visible_to_client: false,
    visible_to_specjalista: false,
    visible_to_everyone: false,
    allow_external_share: false,
    otp_validity_hours: 24,
    otp_max_sessions: 3,
    share_message_template: DEFAULT_SHARE_MESSAGE_TEMPLATE,
    category: null,
    tags: [],
    is_active: true,
    is_featured: false,
  });
  setEditDialogOpen(true);
};
```

### Zmiana w TableCell - miniaturka z okładką (linie 368-386)

```tsx
<TableCell>
  <div className="flex items-center gap-3">
    {/* Thumbnail preview */}
    <div className="relative w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border/50">
      {material.thumbnail_url ? (
        <>
          <img 
            src={material.thumbnail_url} 
            alt={material.title}
            className="w-full h-full object-cover"
          />
          {/* Play overlay for video */}
          {material.content_type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
          )}
          {/* Audio overlay */}
          {material.content_type === 'audio' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Music className="w-4 h-4 text-white" />
            </div>
          )}
        </>
      ) : (
        <div className={cn(
          "w-full h-full flex items-center justify-center",
          material.content_type === 'video' && "bg-blue-500/10 text-blue-500",
          material.content_type === 'audio' && "bg-purple-500/10 text-purple-500",
          material.content_type === 'document' && "bg-orange-500/10 text-orange-500",
          material.content_type === 'image' && "bg-green-500/10 text-green-500",
          material.content_type === 'text' && "bg-gray-500/10 text-gray-500",
        )}>
          <ContentTypeIcon type={material.content_type} className="w-5 h-5" />
        </div>
      )}
    </div>
    
    {/* Title and description */}
    <div>
      <p className="font-medium">{material.title}</p>
      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
        {material.description || 'Brak opisu'}
      </p>
    </div>
  </div>
</TableCell>
```
