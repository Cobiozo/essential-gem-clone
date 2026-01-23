

# Plan: System okładek (thumbnail) dla materiałów Zdrowa Wiedza

## Problem

Obecnie karty materiałów wyświetlają tylko ikonę typu (Play, FileText, itp.) zamiast wizualnego podglądu zawartości. Użytkownicy nie widzą co jest wewnątrz materiału przed kliknięciem.

## Proponowane rozwiązanie

Dodanie pola `thumbnail_url` do tabeli i możliwości upload okładki przez admina, z wyświetlaniem jej na kartach materiałów.

## Wizualny efekt końcowy

**Karta materiału - PRZED:**
```text
┌────────────────────────────────┐
│ [▶ Play]  Wideo                │
│                                │
│ TEST                           │
│ testowy                        │
│                                │
│ [Podgląd]  [Udostępnij]        │
└────────────────────────────────┘
```

**Karta materiału - PO:**
```text
┌────────────────────────────────┐
│ ┌────────────────────────────┐ │
│ │                            │ │
│ │      [OKŁADKA/THUMBNAIL]   │ │
│ │           ▶                │ │
│ │                            │ │
│ └────────────────────────────┘ │
│ [▶ Play]  Wideo   [Wyróżnione] │
│                                │
│ TEST                           │
│ testowy                        │
│                                │
│ Kategoria · 5 min · 👁 1       │
│                                │
│ [Podgląd]  [Udostępnij]        │
└────────────────────────────────┘
```

## Zmiany do wprowadzenia

### 1. Migracja bazy danych

Dodanie kolumny `thumbnail_url`:

```sql
ALTER TABLE public.healthy_knowledge
ADD COLUMN thumbnail_url TEXT;

COMMENT ON COLUMN healthy_knowledge.thumbnail_url IS 'URL okładki/miniatury materiału';
```

### 2. Aktualizacja typu TypeScript

W `src/types/healthyKnowledge.ts`:

```typescript
export interface HealthyKnowledge {
  // ... istniejące pola
  thumbnail_url: string | null;  // ← NOWE
  // ...
}
```

### 3. Formularz admina - upload okładki

W `src/components/admin/HealthyKnowledgeManagement.tsx` dodanie sekcji "Okładka" przed sekcją "Plik":

```text
┌──────────────────────────────────────────────────────────────┐
│ Okładka                                                      │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [Wybierz plik]  (obraz JPG, PNG, WebP)                   │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────┐                                     │
│ │                      │                                     │
│ │   [PODGLĄD OKŁADKI]  │  okładka-wideo.jpg                 │
│ │                      │  125.5 KB              [🗑️ Usuń]   │
│ │                      │                                     │
│ └──────────────────────┘                                     │
│                                                              │
│ 💡 Jeśli nie ustawisz okładki, dla wideo użyjemy             │
│    pierwszej klatki, dla dokumentów - pierwszej strony.      │
└──────────────────────────────────────────────────────────────┘
```

### 4. Wyświetlanie okładki na kartach materiałów

W `src/pages/HealthyKnowledge.tsx` - dodanie elementu okładki powyżej nagłówka karty:

Logika wyświetlania:
1. Jeśli `thumbnail_url` istnieje → wyświetl obraz okładki
2. Jeśli typ = `image` i brak thumbnail → wyświetl `media_url` jako okładkę
3. Jeśli typ = `video` i brak thumbnail → placeholder z ikoną Play
4. Dla pozostałych → placeholder z ikoną typu

```tsx
{/* Thumbnail/Cover Image */}
<div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
  {material.thumbnail_url ? (
    <img 
      src={material.thumbnail_url} 
      alt={material.title}
      className="w-full h-full object-cover"
    />
  ) : material.content_type === 'image' && material.media_url ? (
    <img 
      src={material.media_url} 
      alt={material.title}
      className="w-full h-full object-cover"
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
      <ContentTypeIcon type={material.content_type} className="w-12 h-12 text-muted-foreground/50" />
    </div>
  )}
  
  {/* Play overlay for video */}
  {material.content_type === 'video' && (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
      <div className="p-3 rounded-full bg-white/90 shadow-lg">
        <Play className="w-6 h-6 text-blue-600" />
      </div>
    </div>
  )}
</div>
```

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/xxx_add_thumbnail.sql` | Nowa migracja - kolumna `thumbnail_url` |
| `src/types/healthyKnowledge.ts` | Dodanie pola `thumbnail_url` |
| `src/components/admin/HealthyKnowledgeManagement.tsx` | Sekcja upload okładki + logika |
| `src/pages/HealthyKnowledge.tsx` | Wyświetlanie okładki na kartach |

## Szczegóły techniczne

### Migracja SQL

```sql
-- Dodanie kolumny thumbnail_url
ALTER TABLE public.healthy_knowledge
ADD COLUMN thumbnail_url TEXT;

-- Komentarz
COMMENT ON COLUMN healthy_knowledge.thumbnail_url IS 'URL okładki/miniatury materiału (obraz)';
```

### Aktualizacja typu

```typescript
// src/types/healthyKnowledge.ts
export interface HealthyKnowledge {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  content_type: ContentType;
  media_url: string | null;
  thumbnail_url: string | null;  // ← NOWE
  text_content: string | null;
  // ... reszta bez zmian
}
```

### Funkcja upload okładki (w HealthyKnowledgeManagement.tsx)

```typescript
const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !editingMaterial) return;

  // Walidacja - tylko obrazy
  if (!file.type.startsWith('image/')) {
    toast.error('Okładka musi być obrazem (JPG, PNG, WebP)');
    return;
  }

  setUploading(true);
  try {
    const fileName = `thumbnails/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('healthy-knowledge')
      .upload(fileName, file, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('healthy-knowledge')
      .getPublicUrl(data.path);

    setEditingMaterial({
      ...editingMaterial,
      thumbnail_url: publicUrl,
    });

    toast.success('Okładka przesłana');
  } catch (error: any) {
    console.error('Upload error:', error);
    toast.error('Błąd przesyłania okładki');
  } finally {
    setUploading(false);
  }
};
```

### Sekcja okładki w formularzu

```tsx
{/* Thumbnail Upload */}
<div className="space-y-2">
  <Label>Okładka (opcjonalnie)</Label>
  <div className="flex items-center gap-2">
    <Input
      type="file"
      onChange={handleThumbnailUpload}
      disabled={uploading}
      accept="image/*"
    />
    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
  </div>
  
  {editingMaterial.thumbnail_url && (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
      <img 
        src={editingMaterial.thumbnail_url} 
        alt="Okładka" 
        className="w-32 h-20 object-cover rounded-lg border shadow-sm"
      />
      <div className="flex-1">
        <p className="text-sm font-medium">Okładka ustawiona</p>
      </div>
      <Button 
        variant="ghost" 
        size="icon"
        type="button"
        onClick={() => setEditingMaterial({
          ...editingMaterial,
          thumbnail_url: null,
        })}
        title="Usuń okładkę"
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  )}
  
  <p className="text-xs text-muted-foreground">
    Jeśli nie ustawisz okładki, dla obrazów zostanie użyty sam plik, 
    dla pozostałych typów - ikona zastępcza.
  </p>
</div>
```

### Karta z okładką (HealthyKnowledge.tsx)

```tsx
<Card key={material.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
  {/* Thumbnail/Cover */}
  <div className="relative aspect-video bg-muted overflow-hidden">
    {material.thumbnail_url ? (
      <img 
        src={material.thumbnail_url} 
        alt={material.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
    ) : material.content_type === 'image' && material.media_url ? (
      <img 
        src={material.media_url} 
        alt={material.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
        <ContentTypeIcon type={material.content_type} className="w-16 h-16 text-muted-foreground/30" />
      </div>
    )}
    
    {/* Play overlay for video/audio */}
    {(material.content_type === 'video' || material.content_type === 'audio') && (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="p-4 rounded-full bg-black/50 backdrop-blur-sm group-hover:bg-primary/80 transition-colors">
          <Play className="w-8 h-8 text-white" />
        </div>
      </div>
    )}
    
    {/* Featured badge */}
    {material.is_featured && (
      <Badge className="absolute top-2 right-2 bg-yellow-500/90 text-yellow-950">
        Wyróżnione
      </Badge>
    )}
  </div>
  
  <CardHeader className="pb-3">
    {/* Type badge */}
    <div className="flex items-center gap-2">
      <div className={cn("p-1.5 rounded", ...)}>
        <ContentTypeIcon type={material.content_type} className="w-3 h-3" />
      </div>
      <Badge variant="outline" className="text-xs">
        {CONTENT_TYPE_LABELS[material.content_type]}
      </Badge>
    </div>
    
    <CardTitle className="text-lg mt-2 line-clamp-2">
      {material.title}
    </CardTitle>
    ...
  </CardHeader>
  ...
</Card>
```

## Podsumowanie

| Element | Przed | Po |
|---------|-------|-----|
| Karta materiału | Tylko ikona typu | Pełna okładka z obrazem |
| Formularz admina | Brak opcji okładki | Upload z podglądem |
| Baza danych | Brak pola | Nowa kolumna `thumbnail_url` |
| Efekt hover | Brak | Powiększenie okładki + zmiana koloru przycisku Play |

