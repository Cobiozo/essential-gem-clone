

# Uzupełnienie edytorów bloków, upload obrazów i integracja produktów

## Zakres pracy

### 1. Storage bucket `landing-images` (migracja SQL)
- Utworzenie publicznego bucketu `landing-images` w Supabase Storage
- RLS: authenticated users mogą uploadować do folderu `{user_id}/`, publiczny odczyt

### 2. Komponent `ImageUploadField` (współdzielony)
Reużywalny komponent uploadu obrazków używany we wszystkich edytorach:
- Input file + przycisk upload
- Upload do `landing-images/{user_id}/{timestamp}_{filename}`
- Podgląd miniaturki po uploadzie
- Zwraca public URL

**Plik:** `src/components/leader/block-editors/ImageUploadField.tsx`

### 3. Siedem dedykowanych edytorów bloków (zastępują GenericBlockEditor)

| Edytor | Pola | Upload obrazu |
|--------|------|---------------|
| `ImageBlockEditor` | image (upload), alt_text, caption | Tak |
| `ProductsBlockEditor` | heading, wybór z `product_catalog` (checkbox lista) | Nie (obrazki z katalogu) |
| `CtaButtonBlockEditor` | text, link, variant (select: primary/secondary/outline) | Nie |
| `TestimonialBlockEditor` | quote (textarea), author_name, author_image (upload) | Tak |
| `VideoBlockEditor` | video_url, title | Nie |
| `FormBlockEditor` | heading, fields (multi-checkbox), submit_text | Nie |
| `DividerBlockEditor` | style (select: line/space/dots) | Nie |

**Pliki:** `src/components/leader/block-editors/{Name}BlockEditor.tsx` — 7 nowych plików

### 4. Upload w HeroBlockEditor
Rozszerzenie istniejącego `HeroBlockEditor` — zamiana pola `URL tła (obrazek)` na `ImageUploadField`

### 5. Integracja ProductsBlockEditor z `product_catalog`
- Edytor pobiera `product_catalog` z Supabase (`is_active = true`)
- Lider zaznacza checkboxami produkty, które chce wyświetlić
- Dane bloku `products` zmienione: `items` zawiera `catalog_id` + opcjonalny `purchase_url` (link partnerski)
- Renderer `ProductsBlock` rozpoznaje oba tryby: stary (inline items) i nowy (catalog_id → fetch z katalogu)

### 6. Aktualizacja `BlockEditor` switch w `LeaderLandingEditorView.tsx`
Dodanie 7 nowych case'ów w switch zamiast `default: GenericBlockEditor`

### 7. Typ `ProductsBlockData` — rozszerzenie
Dodanie opcjonalnego pola `catalog_items` obok istniejącego `items` dla kompatybilności wstecznej:
```typescript
export interface ProductsCatalogItem {
  catalog_id: string;
  purchase_url?: string;
}

export interface ProductsBlockData {
  heading?: string;
  items: ProductItem[];           // stary tryb (inline)
  catalog_items?: ProductsCatalogItem[]; // nowy tryb (z katalogu)
}
```

## Pliki do modyfikacji/utworzenia

- **Migracja SQL**: bucket `landing-images` + RLS
- **Nowe (8)**: `ImageUploadField.tsx` + 7 edytorów bloków
- **Zmiana (3)**: `HeroBlockEditor.tsx` (upload), `LeaderLandingEditorView.tsx` (switch), `leaderLanding.ts` (typy)
- **Zmiana (1)**: `ProductsBlock.tsx` (obsługa catalog_items)

Łącznie ~12 plików, z czego 8 nowych komponentów.

