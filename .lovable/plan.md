

# Plan: Edycja linków produktów w trybie podglądu + paleta kolorów zamiast hex

## Dwa zadania

### A. Klikanie w produkt w trybie edycji → dodanie linku partnerskiego

W trybie edycji (`isOwner`) na stronie partnera (`PartnerPage.tsx`), kliknięcie na kartę produktu (w `ProductsGridSection` i `ProductsWithFormSection`) otwiera mały dialog/popover z polem na wpisanie linku zakupowego. Po zapisaniu — link jest utrwalany w `partner_product_links` via Supabase.

**Zmiany:**

| Plik | Zmiana |
|------|--------|
| `ProductsGridSection.tsx` | Dodać prop `isEditing` + `onProductLinkSave`. W trybie edycji: kliknięcie karty otwiera Popover z Input na URL + przycisk Zapisz (zamiast otwierania linku). |
| `ProductsWithFormSection.tsx` | Analogicznie — ten sam mechanizm. |
| `PartnerPage.tsx` | Przekazać `isEditing={isOwner}` i callback `onProductLinkSave` do sekcji produktowych. Callback zapisuje link do `partner_product_links` via Supabase. |

**UX:**
```text
[Karta produktu] → klik w trybie edycji →
  ┌──────────────────────────┐
  │ Link zakupowy:           │
  │ [https://...           ] │
  │        [Anuluj] [Zapisz] │
  └──────────────────────────┘
```

### B. Paleta kolorów zamiast wpisywania hex w edytorach CMS

Zamienić wszystkie pola `<Input>` z "Kolor (hex)" na natywny HTML `<input type="color">` z wizualnym podglądem. Prosty, natywny color picker — użytkownik klika w kolorowy kwadrat, otwiera się systemowa paleta kolorów.

**Zmiany:**

| Plik | Zmiana |
|------|--------|
| `src/components/ui/color-input.tsx` | Nowy komponent: połączenie `<input type="color">` z podglądem koloru i opcjonalnym polem tekstowym hex. |
| `HeroSectionEditor.tsx` | Zamienić Input na ColorInput dla `bg_color`, `text_color`, `cta_bg_color` |
| `TextImageSectionEditor.tsx` | Zamienić dla `item_icon_color`, `cta_bg_color` |
| `ProductsGridEditor.tsx` | Zamienić dla `cta_bg_color` |
| `ProductsWithFormEditor.tsx` | Zamienić dla `cta_bg_color` |
| `ContactFormEditor.tsx` | Zamienić dla `cta_bg_color` |
| `CtaBannerEditor.tsx` | Zamienić dla `bg_color` |

Komponent `ColorInput` — klikasz w kolorowy kwadracik → otwiera się natywna paleta systemowa. Obok widoczny hex jako tekst (edytowalny dla zaawansowanych).

