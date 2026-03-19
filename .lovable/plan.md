

# Plan: Produkty z katalogu zamiast hardkodowanych w szablonie

## Problem
Sekcja `products_with_form` w szablonie "PureLifeCenter2026" ma hardkodowane kolumny produktów w JSON-ie. Powinny one pochodzić z katalogu produktów admina (`product_catalog`).

## Rozwiązanie

### 1. `ProductsWithFormSection.tsx` — zmiana logiki wyboru produktów
Odwrócić priorytet: **zawsze** używać produktów z katalogu (`products` prop), a `columns` z config traktować jako fallback tylko gdy brak produktów w katalogu.

Obecna logika (linia 19):
```ts
const items = columns?.length > 0 ? columns : productLinks.map(...)
```

Nowa logika:
```ts
// Użyj produktów z katalogu (przekazanych jako prop), mapując je z danymi
const catalogItems = products.map(p => ({
  name: p.name,
  description: p.description || '',
  image_url: p.image_url || '',
  cta_text: config.default_cta_text || 'Zobacz szczegóły',
  purchase_url: productLinks.find(lp => lp.product_id === p.id)?.purchase_url || '#',
}));

const items = catalogItems.length > 0 ? catalogItems : (columns || []);
```

### 2. `ProductsWithFormEditor.tsx` — usunąć ręczne kolumny produktów
Usunąć fieldset "Produkty" z edytora (bo produkty zarządzane są w katalogu). Zostawić tylko heading, CTA color i formularz.

### 3. Template seed — wyczyścić `columns`
Zaktualizować migrację/szablon żeby `columns` było pustą tablicą `[]`, bo produkty będą ładowane z katalogu.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/partner-page/sections/ProductsWithFormSection.tsx` | Priorytet: catalog products > columns |
| `src/components/admin/template-sections/ProductsWithFormEditor.tsx` | Usunąć ręczne zarządzanie kolumnami produktów |

