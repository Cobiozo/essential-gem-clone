
## Sortowanie grafik w Bibliotece + poprawka znacznika "Nowa"

### 1. Znacznik "Nowa" -- tylko dla grafik dodanych w ostatnich 7 dniach

Obecnie `is_new` jest ustawiane recznie w bazie. Zamiast polegac na tym polu, logika wyswietlania znacznika "Nowa" w `GraphicsCard` i w siatce grafik bedzie oparta na dacie: `created_at` musi byc nie starsze niz 7 dni od teraz.

**Zmiana w `src/components/share/GraphicsCard.tsx`:**
- Zamiast `resource.is_new` uzyc warunku: `new Date(resource.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)`

**Zmiana w `src/types/knowledge.ts`:**
- Brak zmian w typie -- pole `is_new` pozostaje, ale nie bedzie uzywane do wyswietlania znacznika w grafice.

### 2. Sortowanie grafik

Dodac nowy stan `graphicsSortBy` w `src/pages/KnowledgeCenter.tsx` z opcjami:
- **"newest"** (domyslnie) -- najnowsze u gory (`created_at` malejaco)
- **"oldest"** -- najstarsze u gory (`created_at` rosnaco)
- **"alphabetical"** -- alfabetycznie A-Z po tytule
- **"most_downloaded"** -- po `download_count` malejaco

Dodac `Select` obok istniejacego filtru kategorii w pasku filtrow grafik.

### 3. Domyslne sortowanie -- najnowsze u gory

Zmiana w `filteredGraphics` -- po filtrowaniu dodac sortowanie. Domyslnie `created_at DESC` (najnowsze na gorze).

### Zmiany techniczne

**Plik: `src/pages/KnowledgeCenter.tsx`**

1. Nowy stan: `const [graphicsSortBy, setGraphicsSortBy] = useState<string>('newest');`

2. Zmiana `filteredGraphics` -- po `.filter(...)` dodac `.sort(...)`:
```text
const filteredGraphics = graphicsResources
  .filter(r => { ...existing logic... })
  .sort((a, b) => {
    switch (graphicsSortBy) {
      case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'alphabetical': return a.title.localeCompare(b.title);
      case 'most_downloaded': return (b.download_count || 0) - (a.download_count || 0);
      default: return 0;
    }
  });
```

3. Nowy `Select` w UI -- dodany obok filtru kategorii (linia ~625-635):
```text
<Select value={graphicsSortBy} onValueChange={setGraphicsSortBy}>
  <SelectTrigger className="w-full sm:w-[200px]">
    <SelectValue placeholder="Sortowanie" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="newest">Najnowsze</SelectItem>
    <SelectItem value="oldest">Najstarsze</SelectItem>
    <SelectItem value="alphabetical">Alfabetycznie</SelectItem>
    <SelectItem value="most_downloaded">Najpopularniejsze</SelectItem>
  </SelectContent>
</Select>
```

4. Przycisk "Wyczysc filtry" -- dodac resetowanie sortowania: `setGraphicsSortBy('newest')`.

**Plik: `src/components/share/GraphicsCard.tsx`**

1. Zamiana warunku `resource.is_new` na:
```text
const isNew = new Date(resource.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
```
Uzyc `isNew` zamiast `resource.is_new` przy renderowaniu Badge "Nowa".

**Plik: `src/types/knowledge.ts`** -- bez zmian.
