

## Kompaktowy podgląd testymoniali z galerią zdjęć

### Problem
1. Podgląd testymoniali otwiera się w dużym dialogu (max-w-4xl) — niewygodny do przeglądania
2. Brak obsługi wielu zdjęć per testymonial — w bazie jest tylko jedno pole `media_url`

### Rozwiązanie

**1. Migracja bazy — nowa kolumna `gallery_urls`**
- Dodać kolumnę `gallery_urls text[] default '{}'` do tabeli `healthy_knowledge`
- Pozwoli przechowywać wiele URL-i zdjęć oprócz głównego `media_url`

**2. Typy — `src/types/healthyKnowledge.ts`**
- Dodać `gallery_urls: string[]` do interfejsu `HealthyKnowledge`

**3. Admin — dodawanie wielu zdjęć**
- W formularzu edycji (`HealthyKnowledgeManagement.tsx`), gdy kategoria = "Testymoniale":
  - Dodać sekcję "Galeria zdjęć" z możliwością uploadu wielu obrazów
  - Podgląd miniatur z przyciskiem usuwania każdego
  - Upload do storage `healthy-knowledge/gallery/`

**4. Strona użytkownika — kompaktowy podgląd**
- W zakładce "Testymoniale" zmienić podgląd z dużego Dialog na kompaktowy:
  - Mniejszy dialog (`max-w-lg`) z karuzela zdjęć (Embla Carousel — już zainstalowany)
  - Tytuł, opis i galeria zdjęć (media_url + gallery_urls) w karuzeli z nawigacją strzałkami i kropkami
  - Tekst pod karuzelą — kompaktowy, czytelny układ

### Szczegóły techniczne

Migracja:
```sql
ALTER TABLE public.healthy_knowledge 
ADD COLUMN gallery_urls text[] DEFAULT '{}';
```

Karuzela w podglądzie testymoniali (fragment):
```tsx
const allImages = [material.media_url, ...(material.gallery_urls || [])].filter(Boolean);

<Carousel opts={{ loop: true }}>
  <CarouselContent>
    {allImages.map((url, i) => (
      <CarouselItem key={i}>
        <img src={url} className="w-full rounded-lg object-contain max-h-[50vh]" />
      </CarouselItem>
    ))}
  </CarouselContent>
  {allImages.length > 1 && <>
    <CarouselPrevious />
    <CarouselNext />
  </>}
</Carousel>
```

Galeria upload w edytorze admin (fragment):
```tsx
{editingMaterial.category === 'Testymoniale' && (
  <div>
    <Label>Galeria zdjęć</Label>
    <Input type="file" accept="image/*" multiple onChange={handleGalleryUpload} />
    <div className="grid grid-cols-4 gap-2 mt-2">
      {(editingMaterial.gallery_urls || []).map((url, i) => (
        <div key={i} className="relative">
          <img src={url} className="w-full aspect-square object-cover rounded" />
          <Button size="icon" onClick={() => removeGalleryImage(i)}>
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
  </div>
)}
```

Zmiana dotyczy 4 plików + 1 migracja SQL.

