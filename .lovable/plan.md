

# Plan: Ujednolicenie uploadu w module "Zdrowa Wiedza"

## Cel

Zamienić prostą implementację uploadu w `HealthyKnowledgeManagement.tsx` (Supabase ~50MB limit) na komponent `<MediaUpload />` używany w Akademii (VPS do 2GB).

---

## Porównanie: Akademia vs Zdrowa Wiedza

| Aspekt | Akademia (TrainingManagement) | Zdrowa Wiedza (obecna) |
|--------|-------------------------------|------------------------|
| Komponent | `<MediaUpload />` | Prosty `<Input type="file">` |
| Hook | `useLocalStorage` | `supabase.storage.upload()` |
| Limit | **2GB** (VPS) | **~50MB** (Supabase) |
| Pasek postępu | ✅ Tak | ❌ Tylko spinner |
| Biblioteka plików | ✅ Tak | ❌ Brak |
| Wykrywanie czasu video | ✅ Automatyczne | ❌ Brak |
| Podanie URL | ✅ Tak | ❌ Brak |

---

## Lokalizacja problemu

**Plik:** `src/components/admin/HealthyKnowledgeManagement.tsx`

**Linie 152-186** - funkcja `handleFileUpload`:
```typescript
// OBECNA IMPLEMENTACJA (problemowa)
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !editingMaterial) return;

  setUploading(true);
  try {
    // ❌ Bezpośredni upload do Supabase Storage - limit ~50MB
    const { error: uploadError } = await supabase.storage
      .from('healthy-knowledge')
      .upload(filePath, file);
    // ...
  }
};
```

**Linie 733-798** - UI uploadu:
```typescript
// OBECNY UI (prosty)
<Input
  type="file"
  onChange={handleFileUpload}
  disabled={uploading}
  accept={...}
/>
{uploading && <Loader2 className="w-4 h-4 animate-spin" />}
```

---

## Rozwiązanie

Zastąpić prostą implementację komponentem `<MediaUpload />` identycznym jak w Akademii.

---

## Plan zmian

### Krok 1: Usunięcie funkcji `handleFileUpload` (linie 152-186)

Funkcja nie będzie już potrzebna - `<MediaUpload />` obsługuje upload wewnętrznie.

### Krok 2: Dodanie callbacka `handleMediaUploaded` (wzorzec z Akademii)

```typescript
const handleMediaUploaded = (url: string, type: string, altText?: string, durationSeconds?: number) => {
  if (!editingMaterial) return;
  
  setEditingMaterial({
    ...editingMaterial,
    media_url: url,
    file_name: altText || url.split('/').pop() || 'file',
    file_size: null, // MediaUpload nie zwraca rozmiaru, ale mamy URL
    content_type: type as any,
  });
};
```

### Krok 3: Import komponentu MediaUpload

```typescript
import { MediaUpload } from '@/components/MediaUpload';
```

### Krok 4: Zamiana UI uploadu (linie 733-798)

**PRZED:**
```tsx
<div className="space-y-2">
  <Label>Plik</Label>
  <div className="flex items-center gap-2">
    <Input
      type="file"
      onChange={handleFileUpload}
      disabled={uploading}
      accept={...}
    />
    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
  </div>
  {/* Preview code... */}
</div>
```

**PO:**
```tsx
<div className="space-y-2">
  <Label>Plik</Label>
  <MediaUpload
    onMediaUploaded={handleMediaUploaded}
    currentMediaUrl={editingMaterial.media_url || undefined}
    currentMediaType={editingMaterial.content_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
    allowedTypes={
      editingMaterial.content_type === 'video' ? ['video'] :
      editingMaterial.content_type === 'audio' ? ['audio'] :
      editingMaterial.content_type === 'image' ? ['image'] :
      editingMaterial.content_type === 'document' ? ['document'] :
      ['video', 'audio', 'image', 'document']
    }
    maxSizeMB={2048}
  />
</div>
```

---

## Korzyści po wdrożeniu

1. **Pliki do 2GB** - pełna zgodność z Akademią
2. **Rzeczywisty pasek postępu** - widoczny procent uploadu
3. **Biblioteka plików** - dostęp do wcześniej przesłanych plików
4. **URL zewnętrzny** - możliwość podania linku zamiast uploadu
5. **Automatyczne wykrywanie czasu video** - dla plików wideo
6. **Usuwanie starych plików** - cleanup z VPS przy zamianie

---

## Przepływ po wdrożeniu

```text
┌─────────────────────────────────────────────────────────────┐
│              Admin wybiera plik 126MB+ w "Zdrowa Wiedza"    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   <MediaUpload /> komponent                 │
│                                                             │
│   1. Wybór pliku przez Input / URL / Biblioteka             │
│   2. Sprawdzenie rozmiaru (≤2MB → Supabase, >2MB → VPS)     │
│   3. Upload z paskiem postępu (Progress bar)                │
│   4. Callback onMediaUploaded(url, type, alt, duration)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  handleMediaUploaded()                      │
│                                                             │
│   setEditingMaterial({                                      │
│     ...editingMaterial,                                     │
│     media_url: url,         // https://purelife.info.pl/... │
│     file_name: 'video.mp4',                                 │
│     content_type: 'video',                                  │
│   })                                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              handleSave() → Zapis do bazy danych            │
│                                                             │
│   media_url: https://purelife.info.pl/uploads/...           │
└─────────────────────────────────────────────────────────────┘
```

---

## Folder docelowy

**UWAGA:** Komponent `<MediaUpload />` obecnie używa folderu `training-media`. 

Dla Zdrowej Wiedzy można:
- **Opcja A:** Użyć tego samego folderu `training-media` (prostsze)
- **Opcja B:** Dodać prop `folder` do `<MediaUpload />` i użyć `healthy-knowledge`

Rekomenduję Opcję A dla uproszczenia - pliki i tak są rozróżnialne po nazwie i timestampie.

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/HealthyKnowledgeManagement.tsx` | Import `MediaUpload`, nowy callback, zamiana UI |

---

## Sekcja techniczna

### Szczegółowe zmiany w HealthyKnowledgeManagement.tsx

**1. Import (dodać na górze):**
```typescript
import { MediaUpload } from '@/components/MediaUpload';
```

**2. Usunąć funkcję `handleFileUpload` (linie 152-186)**

**3. Usunąć zmienną stanu `uploading` (linia 55)** - MediaUpload ma własny stan

**4. Dodać nową funkcję (po `handleEdit`):**
```typescript
const handleMediaUploaded = (url: string, type: string, altText?: string, durationSeconds?: number) => {
  if (!editingMaterial) return;
  
  setEditingMaterial({
    ...editingMaterial,
    media_url: url,
    file_name: altText || url.split('/').pop() || 'uploaded_file',
    file_size: null,
  });
};
```

**5. Zamienić sekcję File Upload (linie 733-798):**
```tsx
{/* File Upload - używamy MediaUpload jak w Akademii */}
{editingMaterial.content_type !== 'text' && (
  <div className="space-y-2">
    <Label>Plik multimedialny</Label>
    <MediaUpload
      onMediaUploaded={handleMediaUploaded}
      currentMediaUrl={editingMaterial.media_url || undefined}
      currentMediaType={editingMaterial.content_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
      allowedTypes={
        editingMaterial.content_type === 'video' ? ['video'] :
        editingMaterial.content_type === 'audio' ? ['audio'] :
        editingMaterial.content_type === 'image' ? ['image'] :
        editingMaterial.content_type === 'document' ? ['document'] :
        ['video', 'audio', 'image', 'document']
      }
      maxSizeMB={2048}
    />
  </div>
)}
```

