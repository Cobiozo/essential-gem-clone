
# Integracja grafik z zasobów wiedzy do Kataloga produktów

## Problem
Aktualnie admin może dodać obrazek produktu przez:
1. Wpisanie URL ręcznie
2. Wybranie z AdminMediaLibrary (biblioteka mediów)

Życzeniem użytkownika jest dodanie trzeciej opcji: **wybór grafiki z sekcji "Zasoby wiedzy > Grafiki"** (knowledge_resources z resource_type = 'image'), które są już zarządzane w panelu administracyjnym.

## Obecny stan
- Tabela `knowledge_resources` zawiera wszystkie zasoby z polem `resource_type` ('image', 'pdf', 'doc', itd.)
- W `KnowledgeResourcesManagement.tsx` grafiki są filtrowane: `graphicsResources = resources.filter(r => r.resource_type === 'image')`
- Grafiki mają pole `source_url` zawierające URL do grafiki
- `ProductCatalogManager.tsx` już integruje `AdminMediaLibrary` w trybie picker

## Rozwiązanie

### 1. Nowy komponent: `KnowledgeGraphicsPicker.tsx`
Wewnętrzny komponent do wyboru grafik z zasobów wiedzy, analogiczny do AdminMediaLibrary, ale z danymi z `knowledge_resources`:

- Fetch graphics: `knowledge_resources` z `resource_type = 'image'` i `status = 'active'`
- Funkcjonalność: wyszukiwanie, filtrowanie po kategorii, podgląd thumbnailów
- Na klikniecie: callback `onSelect` z wybraną grafiką (zwraca `{ id, title, source_url }`)
- Responsywna siatka pokazująca thumbnaile (podobnie jak AdminMediaLibrary)

### 2. Aktualizacja: `ProductCatalogManager.tsx`
- Dodanie przełącznika/tabs do wyboru źródła obrazka: **"Biblioteka mediów"** vs **"Zasoby wiedzy"**
- Alternatywnie: dodanie drugiego przycisku obok "Biblioteka" — przycisk **"Zasoby wiedzy"**
- Oba przyciski otwierają osobne dialogi
- Stan `showKnowledgeGraphicsPicker: boolean`
- Callback z `KnowledgeGraphicsPicker` ustawia `editingProduct.image_url` na `source_url` wybranej grafiki

### 3. Design decyzji
**Opcja A** (tabbed):
```
[URL ręczny] [Biblioteka mediów] [Zasoby wiedzy]
```
Trzy niezależne źródła — elegancko, ale więcej kodu.

**Opcja B** (przyciski obok URL):
```
[Input URL]  [Biblioteka]  [Zasoby wiedzy]
```
Dwa przyciski otwierające dialogi pickera — kompaktowo, bardziej intuicyjnie.

Rekomendacja: **Opcja B** — najbliżej obecnego desingu.

### 4. Szczegóły techniczne

#### Plik: `src/components/admin/KnowledgeGraphicsPicker.tsx` (nowy)
```typescript
interface KnowledgeGraphic {
  id: string;
  title: string;
  source_url: string;
}

interface KnowledgeGraphicsPickerProps {
  onSelect: (graphic: KnowledgeGraphic) => void;
}

export const KnowledgeGraphicsPicker: React.FC<KnowledgeGraphicsPickerProps> = ({ onSelect }) => {
  // fetch knowledge_resources WHERE resource_type = 'image' AND status = 'active'
  // renderuj grid z thumbnailami
  // onClick -> onSelect(graphic)
}
```

#### Plik: `src/components/admin/ProductCatalogManager.tsx`
- Import `KnowledgeGraphicsPicker`
- Nowy stan: `showKnowledgeGraphicsPicker: boolean`
- Dialog dla knowledge graphics pickera (analogicznie do AdminMediaLibrary picker dialog)
- W sekcji obrazka produktu: drugi przycisk obok "Biblioteka" — "Zasoby wiedzy"
- Callback `onSelect` ustawia `image_url` i zamyka dialog

#### Workflow
1. Admin otwiera dialog edycji produktu
2. Widzi pole URL + 2 przyciski: "Biblioteka" (AdminMediaLibrary) i "Zasoby wiedzy" (KnowledgeGraphicsPicker)
3. Kliknie "Zasoby wiedzy" → otwiera się dialog z siatką grafik z knowledge_resources
4. Wybiera grafikę → `source_url` jest wstawiany w pole `image_url`
5. Dialog zamyka się, admin widzi preview wybranej grafiki
6. Kliknie Save → produkt jest zapisany

### 5. Brak zmian w bazie danych
Istniejąca struktura `knowledge_resources` w pełni obsługuje tę funkcjonalność.

