

# Plan: Automatyczne wznawianie wideo + opcje w masowym dodawaniu grafik

## Problem 1: Wideo - usunięcie promptu "Kontynuuj?"

Aktualnie gdy użytkownik wraca do wideo, widzi ekran z pytaniem "Kontynuować od X:XX?" z przyciskami "Kontynuuj" i "Od początku". Zamiast tego wideo ma automatycznie startować od zapisanej pozycji.

## Problem 2: Masowe dodawanie grafik - brakujące opcje

Obecnie dialog masowego dodawania grafik ma tylko:
- Wybór kategorii

A brakuje opcji dostępnych przy dodawaniu pojedynczej grafiki:
- Widoczność (dla kogo: klienci, partnerzy, specjaliści, wszyscy)
- Akcje (kopiowanie linku, pobieranie, udostępnianie, przekierowanie po kliknięciu)
- Oznaczenia (nowy, wyróżniony, zaktualizowany)
- Status (aktywny, szkic, archiwalny)

---

## Sekcja techniczna

### Zmiana 1: `SecureVideoWithProgress.tsx` - automatyczne wznawianie

Usunięcie warunkowego renderowania promptu i automatyczne ustawienie `initialTime` na `savedPosition`:

```typescript
export const SecureVideoWithProgress: React.FC<SecureVideoWithProgressProps> = ({
  mediaUrl,
  videoId,
  className,
  altText
}) => {
  const {
    savedPosition,
    handleTimeUpdate,
    handlePlayStateChange
  } = useVideoProgress({ videoId });
  
  // Automatyczne ustawienie pozycji startowej na zapisaną
  const initialTime = savedPosition || 0;
  
  return (
    <SecureMedia
      mediaUrl={mediaUrl}
      mediaType="video"
      controlMode="secure"
      className={className}
      altText={altText}
      initialTime={initialTime}
      onTimeUpdate={handleTimeUpdate}
      onPlayStateChange={handlePlayStateChange}
    />
  );
};
```

Rezultat: Wideo od razu ładuje się od zapisanej pozycji bez pytania użytkownika.

---

### Zmiana 2: `KnowledgeResourcesManagement.tsx` - rozszerzenie masowego uploadu

#### 2.1 Nowe stany dla opcji masowego uploadu

```typescript
// Bulk upload extended options
const [bulkVisibility, setBulkVisibility] = useState({
  visible_to_clients: false,
  visible_to_partners: true,
  visible_to_specjalista: true,
  visible_to_everyone: false
});
const [bulkActions, setBulkActions] = useState({
  allow_copy_link: true,
  allow_download: true,
  allow_share: true,
  allow_click_redirect: false,
  click_redirect_url: ''
});
const [bulkStatus, setBulkStatus] = useState<ResourceStatus>('active');
const [bulkBadges, setBulkBadges] = useState({
  is_featured: false,
  is_new: true,
  is_updated: false
});
```

#### 2.2 Rozszerzenie dialogu masowego uploadu

Dodanie zakładek (Tabs) podobnych jak w pojedynczym edytorze:

```typescript
<Dialog open={bulkUploadOpen} ...>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>...</DialogHeader>
    
    <Tabs defaultValue="files" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="files">Pliki</TabsTrigger>
        <TabsTrigger value="visibility">Widoczność</TabsTrigger>
        <TabsTrigger value="actions">Akcje</TabsTrigger>
        <TabsTrigger value="badges">Oznaczenia</TabsTrigger>
      </TabsList>
      
      <TabsContent value="files">
        {/* Kategoria + wybór plików + lista plików (obecna funkcjonalność) */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Kategoria dla wszystkich grafik</Label>
            <Select ...>{/* kategorie */}</Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              {/* active, draft, archived */}
            </Select>
          </div>
          {/* File input i lista plików */}
        </div>
      </TabsContent>
      
      <TabsContent value="visibility">
        <VisibilityEditor
          value={bulkVisibility}
          onChange={setBulkVisibility}
        />
      </TabsContent>
      
      <TabsContent value="actions">
        <div className="space-y-4">
          {/* Kopiowanie linku */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              <Label>Pokaż "Kopiuj link"</Label>
            </div>
            <Switch checked={bulkActions.allow_copy_link} 
              onCheckedChange={(v) => setBulkActions({...bulkActions, allow_copy_link: v})} />
          </div>
          {/* Pobieranie */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <Label>Pokaż "Pobierz"</Label>
            </div>
            <Switch checked={bulkActions.allow_download} 
              onCheckedChange={(v) => setBulkActions({...bulkActions, allow_download: v})} />
          </div>
          {/* Udostępnianie */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              <Label>Pokaż "Udostępnij"</Label>
            </div>
            <Switch checked={bulkActions.allow_share} 
              onCheckedChange={(v) => setBulkActions({...bulkActions, allow_share: v})} />
          </div>
          {/* Przekierowanie po kliknięciu */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                <Label>Przekieruj po kliknięciu</Label>
              </div>
              <Switch checked={bulkActions.allow_click_redirect}
                onCheckedChange={(v) => setBulkActions({...bulkActions, allow_click_redirect: v})} />
            </div>
            {bulkActions.allow_click_redirect && (
              <Input value={bulkActions.click_redirect_url}
                onChange={(e) => setBulkActions({...bulkActions, click_redirect_url: e.target.value})}
                placeholder="https://..." />
            )}
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="badges">
        <div className="space-y-4">
          {/* Wyróżniony */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <Label>Wyróżniony</Label>
            </div>
            <Switch checked={bulkBadges.is_featured}
              onCheckedChange={(v) => setBulkBadges({...bulkBadges, is_featured: v})} />
          </div>
          {/* Nowy */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <Label>Oznacz jako nowy</Label>
            </div>
            <Switch checked={bulkBadges.is_new}
              onCheckedChange={(v) => setBulkBadges({...bulkBadges, is_new: v})} />
          </div>
          {/* Zaktualizowany */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-purple-500" />
              <Label>Oznacz jako zaktualizowany</Label>
            </div>
            <Switch checked={bulkBadges.is_updated}
              onCheckedChange={(v) => setBulkBadges({...bulkBadges, is_updated: v})} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
    
    {/* Progress + Footer */}
  </DialogContent>
</Dialog>
```

#### 2.3 Modyfikacja `handleBulkUpload()` - użycie nowych opcji

```typescript
const handleBulkUpload = async () => {
  // ... początek bez zmian ...
  
  const { error } = await supabase
    .from('knowledge_resources')
    .insert([{
      title: file.name.replace(/\.[^/.]+$/, ''),
      description: '',
      resource_type: 'image' as any,
      source_type: 'file',
      source_url: result.url,
      file_name: result.fileName,
      file_size: result.fileSize,
      category: bulkCategory,
      tags: [],
      // Użycie opcji widoczności
      visible_to_clients: bulkVisibility.visible_to_clients,
      visible_to_partners: bulkVisibility.visible_to_partners,
      visible_to_specjalista: bulkVisibility.visible_to_specjalista,
      visible_to_everyone: bulkVisibility.visible_to_everyone,
      // Użycie statusu
      status: bulkStatus,
      version: '1.0',
      // Użycie oznaczeń
      is_featured: bulkBadges.is_featured,
      is_new: bulkBadges.is_new,
      is_updated: bulkBadges.is_updated,
      position: resources.length + i,
      // Użycie akcji
      allow_copy_link: bulkActions.allow_copy_link,
      allow_download: bulkActions.allow_download,
      allow_share: bulkActions.allow_share,
      allow_click_redirect: bulkActions.allow_click_redirect,
      click_redirect_url: bulkActions.allow_click_redirect ? bulkActions.click_redirect_url : null
    }]);
  
  // ... reszta bez zmian ...
};
```

#### 2.4 Reset stanów przy zamknięciu dialogu

```typescript
<Dialog open={bulkUploadOpen} onOpenChange={(open) => {
  if (!bulkUploading) {
    setBulkUploadOpen(open);
    if (!open) {
      setBulkFiles([]);
      // Reset wszystkich opcji do domyślnych
      setBulkVisibility({
        visible_to_clients: false,
        visible_to_partners: true,
        visible_to_specjalista: true,
        visible_to_everyone: false
      });
      setBulkActions({
        allow_copy_link: true,
        allow_download: true,
        allow_share: true,
        allow_click_redirect: false,
        click_redirect_url: ''
      });
      setBulkStatus('active');
      setBulkBadges({
        is_featured: false,
        is_new: true,
        is_updated: false
      });
    }
  }
}}>
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `SecureVideoWithProgress.tsx` | Usunięcie promptu "Kontynuuj?" - automatyczne wznawianie |
| `KnowledgeResourcesManagement.tsx` | Rozszerzenie dialogu masowego uploadu o zakładki: Widoczność, Akcje, Oznaczenia |

## Efekt końcowy

**Wideo:**
- Wideo automatycznie startuje od ostatniej zapisanej pozycji
- Brak pytania "Kontynuować?" - płynne działanie

**Masowe dodawanie grafik:**
- 4 zakładki: Pliki, Widoczność, Akcje, Oznaczenia
- Pełna kontrola nad ustawieniami wszystkich dodawanych grafik
- Spójność z edytorem pojedynczej grafiki

