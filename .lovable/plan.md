
# Plan: Naprawienie modułu "Zdrowa Wiedza" - podgląd materiałów i widoczność dla adminów

## Zidentyfikowane problemy

1. **Brak podglądu wideo/materiałów** - przycisk "Podgląd" wyświetla tylko komunikat "funkcja w przygotowaniu" zamiast otwierać materiał
2. **Brak grupy "Admin" w widoczności** - w formularzu edycji brakuje przełącznika dla adminów, mimo że kolumna `visible_to_admin` istnieje w bazie danych
3. **Brak wyświetlania badge "Admin"** - w tabeli materiałów nie pokazuje się znacznik widoczności dla adminów

## Proponowane rozwiązanie

### Zmiana 1: Implementacja podglądu materiałów

Zamiast wyświetlać toast "funkcja w przygotowaniu", otworzy się dialog z odtwarzaczem/podglądem wykorzystujący komponent `SecureMedia`:

```text
┌─────────────────────────────────────────────────┐
│ Podgląd: TEST                              [X]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │          [▶ ODTWARZACZ WIDEO]           │   │
│  │                                         │   │
│  │     ────────────────○───────────────    │   │
│  │     ▶  0:32 / 5:45           🔊  ⛶     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Webinary archiwalne  ·  5:45 min  ·  0 wyśw.  │
└─────────────────────────────────────────────────┘
```

Obsługiwane typy:
- **video** - SecureMedia z odtwarzaczem wideo
- **audio** - SecureMedia z odtwarzaczem audio  
- **image** - SecureMedia z podglądem obrazu
- **document** - Link do otwarcia/pobrania PDF
- **text** - Wyświetlenie treści HTML

### Zmiana 2: Dodanie przełącznika "Tylko Admin"

W sekcji "Widoczność" formularza edycji dodanie przełącznika:

```text
Widoczność
┌─────────────────────────────────────────┐
│ ⭐ Tylko Admin     │ Wszyscy zalogowani │
│     [×]            │     [ ]            │
├────────────────────┼────────────────────┤
│ Partnerzy          │ Klienci            │
│     [ ]            │     [ ]            │
├────────────────────┼────────────────────┤
│ Specjaliści        │                    │
│     [ ]            │                    │
└─────────────────────────────────────────┘
```

**Logika:**
- Gdy zaznaczony "Tylko Admin" → odznacz wszystkie inne opcje
- Gdy zaznaczona inna opcja → upewnij się że `visible_to_admin` = true (admini zawsze widzą)
- Materiał widoczny tylko dla adminów: tylko `visible_to_admin = true`, pozostałe = false

### Zmiana 3: Wyświetlanie badge "Admin" w tabeli

W kolumnie "Widoczność" tabeli materiałów:

```text
Widoczność
─────────────
┌─────────────────────┐
│ ⭐ Admin            │  ← Nowy badge (żółty/złoty)
│ Partner             │
│ Klient              │
└─────────────────────┘
```

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/pages/HealthyKnowledge.tsx` | Dialog podglądu z SecureMedia |
| `src/components/admin/HealthyKnowledgeManagement.tsx` | Przełącznik "Tylko Admin" + badge w tabeli |

## Szczegóły techniczne

### 1. Dialog podglądu materiału (HealthyKnowledge.tsx)

**Nowy stan:**
```tsx
const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
const [previewMaterial, setPreviewMaterial] = useState<HealthyKnowledge | null>(null);
```

**Nowa funkcja handleViewMaterial:**
```tsx
const handleViewMaterial = (material: HealthyKnowledge) => {
  setPreviewMaterial(material);
  setPreviewDialogOpen(true);
  
  // Zwiększ licznik wyświetleń
  supabase
    .from('healthy_knowledge')
    .update({ view_count: material.view_count + 1 })
    .eq('id', material.id);
};
```

**Dialog z SecureMedia:**
```tsx
<Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
  <DialogContent className="max-w-4xl max-h-[90vh]">
    <DialogHeader>
      <DialogTitle>{previewMaterial?.title}</DialogTitle>
      <DialogDescription>{previewMaterial?.description}</DialogDescription>
    </DialogHeader>
    
    {previewMaterial && (
      <div className="space-y-4">
        {/* Video/Audio/Image */}
        {previewMaterial.media_url && previewMaterial.content_type !== 'text' && (
          <SecureMedia
            mediaUrl={previewMaterial.media_url}
            mediaType={previewMaterial.content_type as 'video' | 'audio' | 'image' | 'document'}
            className="w-full rounded-lg"
          />
        )}
        
        {/* Text content */}
        {previewMaterial.content_type === 'text' && previewMaterial.text_content && (
          <div 
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: previewMaterial.text_content }}
          />
        )}
        
        {/* Document download link */}
        {previewMaterial.content_type === 'document' && previewMaterial.media_url && (
          <Button asChild>
            <a href={previewMaterial.media_url} target="_blank" rel="noopener noreferrer">
              <FileText className="w-4 h-4 mr-2" />
              Otwórz dokument
            </a>
          </Button>
        )}
        
        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {previewMaterial.category && <Badge variant="outline">{previewMaterial.category}</Badge>}
          {previewMaterial.duration_seconds && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.floor(previewMaterial.duration_seconds / 60)} min
            </span>
          )}
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>
```

### 2. Przełącznik "Tylko Admin" (HealthyKnowledgeManagement.tsx)

**Lokalizacja:** Sekcja "Widoczność" (linie 724-768)

**Nowy grid z 5 opcjami:**
```tsx
{/* Visibility */}
<div className="space-y-3">
  <Label className="text-base font-semibold">Widoczność</Label>
  <div className="grid grid-cols-2 gap-4">
    {/* NOWY: Tylko Admin */}
    <div className="flex items-center justify-between col-span-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-yellow-500" />
        <Label>Tylko Admin</Label>
      </div>
      <Switch
        checked={
          editingMaterial.visible_to_admin === true &&
          !editingMaterial.visible_to_everyone &&
          !editingMaterial.visible_to_partner &&
          !editingMaterial.visible_to_client &&
          !editingMaterial.visible_to_specjalista
        }
        onCheckedChange={(v) => {
          if (v) {
            setEditingMaterial({
              ...editingMaterial,
              visible_to_admin: true,
              visible_to_everyone: false,
              visible_to_partner: false,
              visible_to_client: false,
              visible_to_specjalista: false,
            });
          } else {
            setEditingMaterial({
              ...editingMaterial,
              visible_to_everyone: true,
            });
          }
        }}
      />
    </div>
    
    {/* Reszta opcji (bez zmian) */}
    <div className="flex items-center justify-between">
      <Label>Wszyscy zalogowani</Label>
      <Switch ... />
    </div>
    {/* ... Partner, Klient, Specjalista ... */}
  </div>
  <p className="text-xs text-muted-foreground">
    💡 "Tylko Admin" ukrywa materiał przed wszystkimi innymi rolami.
  </p>
</div>
```

### 3. Badge "Admin" w tabeli (HealthyKnowledgeManagement.tsx)

**Lokalizacja:** Kolumna "Widoczność" w tabeli (linie 415-421)

```tsx
<TableCell>
  <div className="flex flex-wrap gap-1">
    {/* NOWY: Badge Admin - wyświetlaj gdy tylko admin ma dostęp */}
    {material.visible_to_admin && 
     !material.visible_to_everyone && 
     !material.visible_to_partner && 
     !material.visible_to_client && 
     !material.visible_to_specjalista && (
      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
        <Star className="w-3 h-3 mr-1" />
        Admin
      </Badge>
    )}
    {material.visible_to_everyone && <Badge variant="secondary" className="text-xs">Wszyscy</Badge>}
    {material.visible_to_partner && <Badge variant="secondary" className="text-xs">Partner</Badge>}
    {material.visible_to_client && <Badge variant="secondary" className="text-xs">Klient</Badge>}
    {material.visible_to_specjalista && <Badge variant="secondary" className="text-xs">Specjalista</Badge>}
  </div>
</TableCell>
```

## Wymagane importy

**HealthyKnowledge.tsx:**
```tsx
import { SecureMedia } from '@/components/SecureMedia';
```

**HealthyKnowledgeManagement.tsx:**
```tsx
import { Star } from 'lucide-react'; // już zaimportowane (Star, StarOff)
```

## Podsumowanie zmian

| Element | Przed | Po |
|---------|-------|-----|
| Podgląd materiału | Toast "funkcja w przygotowaniu" | Dialog z odtwarzaczem SecureMedia |
| Widoczność dla adminów | Brak opcji w UI | Przełącznik "Tylko Admin" z wyróżnieniem |
| Badge w tabeli | Brak badge Admin | Złoty badge "Admin" z ikoną gwiazdki |
| Typy obsługiwane | Brak | video, audio, image, document, text |

## Efekt końcowy

1. Użytkownik klika "Podgląd" → otwiera się dialog z odtwarzaczem wideo/audio lub podglądem obrazu/tekstu
2. Admin może utworzyć materiał widoczny tylko dla adminów poprzez zaznaczenie "Tylko Admin"
3. W tabeli materiałów widoczny jest badge "Admin" dla materiałów z ograniczonym dostępem
4. Logika RLS w bazie już obsługuje `visible_to_admin` - nie wymaga zmian w backendzie
