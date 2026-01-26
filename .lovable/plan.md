
# Plan naprawy modułu "Zdrowa Wiedza"

## Zidentyfikowane problemy

### Problem 1: Upload okładek nie działa dla wszystkich adminów
Mimo że obaj użytkownicy (sebastiansnopek87 i dawidkowalczyk.king+1) mają rolę `admin` zarówno w tabeli `profiles` jak i `user_roles`, polityka RLS dla bucketu `healthy-knowledge` może nie działać poprawnie dla wszystkich.

**Przyczyna:** Aktualna polityka używa `auth.role() = 'authenticated'` plus `is_admin()` co może powodować problemy przy sesji. Inne buckety (cms-images, cms-files) używają prostszej składni bez dodatkowego sprawdzania `auth.role()`.

### Problem 2: Okładka jest obcinana w podglądzie
W dialogu edycji materiału okładka ma klasy `w-32 h-20 object-cover` - proporcje 1.6:1 obcinają obrazy o innych proporcjach.

### Problem 3: Widok mobilny niefunkcjonalny
Na iPhonie:
- Tabela z 6 kolumnami nie mieści się na ekranie
- Tekst kolumn wyświetla się pionowo ("Kategoria", "Zdrowie wiedza ogółem")
- Przyciski są zbyt małe i nieużywalne
- Brak kartkowego widoku dla mobile (jak w CronJobsManagement)

---

## Rozwiązania

### Zmiana 1: Uproszczenie polityki RLS dla storage

**Migracja SQL:**
```sql
-- Usuń problematyczne polityki
DROP POLICY IF EXISTS "Admin can upload to healthy-knowledge" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete from healthy-knowledge" ON storage.objects;

-- Nowa prostsza polityka uploadu (bez auth.role() = 'authenticated')
CREATE POLICY "Admins can upload to healthy-knowledge"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'healthy-knowledge' 
  AND (SELECT is_admin())
);

-- Nowa prostsza polityka usuwania
CREATE POLICY "Admins can delete from healthy-knowledge"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'healthy-knowledge' 
  AND (SELECT is_admin())
);
```

### Zmiana 2: Naprawa obcinania okładki

**Plik:** `src/components/admin/HealthyKnowledgeManagement.tsx`

Zmiana z `object-cover` na `object-contain` z tłem i zachowaniem proporcji:

```tsx
// Przed (linie 710-714):
<img 
  src={editingMaterial.thumbnail_url} 
  alt="Okładka" 
  className="w-32 h-20 object-cover rounded-lg border shadow-sm"
/>

// Po:
<img 
  src={editingMaterial.thumbnail_url} 
  alt="Okładka" 
  className="max-w-40 max-h-24 object-contain rounded-lg border shadow-sm bg-muted"
/>
```

### Zmiana 3: Responsywny widok mobilny

Dodanie alternatywnego widoku kartkowego dla mobile (wzorując się na CronJobsManagement):

**Struktura:**
- Desktop (md+): Pozostawienie obecnej tabeli
- Mobile: Lista kart z najważniejszymi informacjami i przyciskami akcji

```tsx
{/* Desktop - tabela */}
<div className="hidden md:block">
  <Card>
    <Table>...</Table>
  </Card>
</div>

{/* Mobile - karty */}
<div className="md:hidden space-y-3">
  {filteredMaterials.map((material) => (
    <Card key={material.id} className="p-4">
      <div className="flex items-start gap-3">
        {/* Thumbnail 16:9 */}
        <div className="relative w-20 aspect-video rounded-lg overflow-hidden...">
          ...
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{material.title}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge>{CONTENT_TYPE_LABELS[material.content_type]}</Badge>
            <Badge>{material.is_active ? 'Aktywny' : 'Ukryty'}</Badge>
          </div>
        </div>
        
        {/* Actions dropdown */}
        <DropdownMenu>...</DropdownMenu>
      </div>
    </Card>
  ))}
</div>
```

### Zmiana 4: Responsywny Dialog edycji

Poprawienie formularza na mobile:
- Zmiana `grid-cols-2` na `grid-cols-1 sm:grid-cols-2`
- Zwiększenie obszarów dotykowych przycisków i switchów

---

## Wizualizacja zmian

```text
MOBILE PRZED:
┌────────────────────────────────┐
│ Tworzywo│Typ│K│W│Status│Akcje │  <- tekst pionowo, nieczytelne
│         │   │a│i│      │      │
│         │   │t│d│      │      │
│         │   │e│o│      │      │
└────────────────────────────────┘

MOBILE PO:
┌────────────────────────────────┐
│ ┌─────┐ Sekretne działanie... │
│ │ ▶️ │ Wideo • Aktywny       │
│ └─────┘                    ⋮  │
├────────────────────────────────┤
│ ┌─────┐ Rola kwasów omega-3..│
│ │ ▶️ │ Wideo • Aktywny       │
│ └─────┘                    ⋮  │
└────────────────────────────────┘
```

---

## Podsumowanie zmian

| Element | Zmiana |
|---------|--------|
| Polityka RLS | Uproszczenie - usunięcie `auth.role()` |
| Podgląd okładki | `object-contain` zamiast `object-cover` |
| Widok mobilny | Kartkowy layout dla ekranów <768px |
| Dialog edycji | Responsywna siatka formularza |

---

## Sekcja techniczna

### Migracja SQL

```sql
-- Uproszczenie polityk RLS dla healthy-knowledge bucket
DROP POLICY IF EXISTS "Admin can upload to healthy-knowledge" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete from healthy-knowledge" ON storage.objects;

CREATE POLICY "Admins can upload to healthy-knowledge"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'healthy-knowledge' 
  AND (SELECT is_admin())
);

CREATE POLICY "Admins can delete from healthy-knowledge"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'healthy-knowledge' 
  AND (SELECT is_admin())
);
```

### Zmiany w HealthyKnowledgeManagement.tsx

**1. Podgląd okładki w dialogu (linia ~713):**
```tsx
<img 
  src={editingMaterial.thumbnail_url} 
  alt="Okładka" 
  className="max-w-40 max-h-24 object-contain rounded-lg border shadow-sm bg-muted"
/>
```

**2. Import DropdownMenu (na górze pliku):**
```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
```

**3. Zastąpienie Table widokiem responsywnym (linie ~355-486):**
```tsx
{/* Desktop view - table */}
<div className="hidden md:block">
  <Card>
    <Table>
      {/* ... istniejący kod tabeli ... */}
    </Table>
  </Card>
</div>

{/* Mobile view - cards */}
<div className="md:hidden space-y-3">
  {filteredMaterials.map((material) => (
    <Card key={material.id} className="overflow-hidden">
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          <div className="relative w-16 aspect-video rounded-lg overflow-hidden flex-shrink-0 border">
            {material.thumbnail_url ? (
              <>
                <img src={material.thumbnail_url} alt="" className="w-full h-full object-cover" />
                {material.content_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <ContentTypeIcon type={material.content_type} className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-medium text-sm truncate">{material.title}</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {CONTENT_TYPE_LABELS[material.content_type as ContentType]}
              </Badge>
              <Badge variant={material.is_active ? "default" : "secondary"} className="text-xs">
                {material.is_active ? 'Aktywny' : 'Ukryty'}
              </Badge>
            </div>
          </div>
          
          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(material)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edytuj
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleFeatured(material)}>
                {material.is_featured ? <StarOff className="w-4 h-4 mr-2" /> : <Star className="w-4 h-4 mr-2" />}
                {material.is_featured ? 'Usuń z wyróżnionych' : 'Wyróżnij'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleActive(material)}>
                {material.is_active ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {material.is_active ? 'Ukryj' : 'Aktywuj'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(material)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Usuń
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  ))}
</div>
```

**4. Responsywny formularz w dialogu (linie ~619, ~778, ~860):**
```tsx
// Zmiana grid-cols-2 na responsywny
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```
