## Plan: Boczny edytor postu z live preview, WYSIWYG i pełną kontrolą stylu

### Cel
Po kliknięciu "Edytuj" na stronie postu (`/aktualnosci/:slug`) admin nie widzi dotychczasowego dialogu, lecz **boczny przewijalny panel (~480 px po prawej)** z pełnym zestawem kontrolek, a strona postu z lewej aktualizuje się **na żywo** wraz z każdą zmianą. Zapis idzie do bazy dopiero po kliknięciu "Zapisz".

---

### 1. Layout

```text
┌─────────────────────────────────┬──────────────────┐
│  Strona postu — LIVE PREVIEW    │  Edytor (480px)  │
│  (PostContent + style overlays) │  scrollable      │
│                                 │  zakładki        │
│  Aktualizuje się przy każdej    │  + sticky save   │
│  zmianie w panelu po prawej     │                  │
└─────────────────────────────────┴──────────────────┘
```

- Panel: stały `position: fixed; right: 0; top: 0; bottom: 0; width: 480px; overflow-y: auto`
- Strona postu po prawej dostaje `padding-right: 480px` w trybie edycji
- Backdrop nie zaciemnia strony (live preview musi być widoczny)
- Sticky pasek na górze panelu z zakładkami; sticky pasek na dole z "Anuluj / Zapisz" + status "Niezapisane zmiany"
- Stan edycji trzymany w lokalnym `draft` (kopia postu) — `PostContent` renderowany z `draft` przy włączonym edytorze

### 2. Zakładki w panelu

**Treść**
- Tytuł — `<input>` + sticky-toolbar z kontrolą stylu (rozmiar 16/24/32/48/64 px, waga 400/600/700/900, kolor, wyrównanie L/C/R)
- Krótki opis — `<textarea>` + kontrola stylu (rozmiar, kolor, wyrównanie)
- Treść — **TipTap WYSIWYG**:
  - Pasek narzędzi: B / I / U / S, H1–H4, listy ul/ol, cytat, link, kod, hr, undo/redo
  - Rozszerzenia: Color, Highlight, TextAlign, Underline, Link, Image (inline), Placeholder
  - Treść zapisywana jako HTML w polu `content`

**Media / Okładka**
- Cover URL + upload (`uploadNewsHubFile`)
- `object-fit`: cover / contain / fill
- Wysokość: slider 200–700 px
- `object-position`: 9-kierunkowy grid (top-left, top, top-right, ...)
- Nakładka: kolor + opacity (slider)
- Galeria / video URL / file / link / embed — kompletny zestaw z obecnego `PostFormDialog`

**Wygląd strony**
- Tło postu: `none` / kolor / gradient (2 kolory + kąt) / obrazek (upload)
- Padding strony (kontener), max-width

**Meta**
- Typ (Select), Kategoria, Tagi, Slug (auto z tytułu z możliwością edycji), Rozmiar w siatce
- Przypnięte, Opublikowany

### 3. Przechowywanie stylów

Nowe pole JSONB `style_overrides` w `news_hub_posts` (migracja). Kształt:

```json
{
  "title": { "size": 48, "weight": 900, "color": "#fff", "align": "left" },
  "shortDescription": { "size": 18, "color": "#bbb", "align": "left" },
  "cover": { "fit": "cover", "height": 420, "position": "center", "overlay": "#000", "overlayOpacity": 0.2 },
  "page": { "background": "linear-gradient(...)", "maxWidth": 896 }
}
```

`PostContent` przyjmuje opcjonalny prop `styleOverrides` i aplikuje je inline. Brak overrides = obecny wygląd.

### 4. Live preview

- `NewsHubPostPage` w trybie edycji renderuje `PostContent` z `draft` zamiast `post`, każda zmiana w panelu = `setDraft(...)`, natychmiastowa aktualizacja
- "Zapisz" wysyła `update` do Supabase + zamyka panel + usuwa `?edit=1`
- "Anuluj" przy niezapisanych zmianach pokazuje `confirm("Porzucić zmiany?")`
- Blokada zamknięcia karty przy niezapisanych zmianach (`beforeunload`)
- `globalEditingStateRef` aktywny w trybie edycji (zgodnie z regułą projektu — blokuje silent re-renders)

### 5. Stary `PostFormDialog`

- Zostaje używany **tylko do tworzenia nowych** postów z `/admin/news-hub` (wymaga typu przed inline)
- Na stronie postu zastąpiony nowym `PostInlineEditor`

### 6. Zależności

- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-color`, `@tiptap/extension-text-style`, `@tiptap/extension-text-align`, `@tiptap/extension-underline`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-placeholder`, `@tiptap/extension-highlight`

### 7. Pliki

Nowe:
- `src/components/news-hub/PostInlineEditor.tsx` — boczny panel z zakładkami i sticky footer
- `src/components/news-hub/editor/RichTextEditor.tsx` — TipTap z toolbar
- `src/components/news-hub/editor/StyleControls.tsx` — wspólne kontrolki (size/color/align/weight)
- `src/components/news-hub/editor/CoverControls.tsx` — okładka + overlay + fit/position
- `src/components/news-hub/editor/MediaControls.tsx` — type-specific (video/gallery/file/link/embed)
- `src/components/news-hub/editor/MetaControls.tsx` — kategoria/typ/tagi/slug/pin/publish/bento
- `src/components/news-hub/editor/PageStyleControls.tsx` — tło/maxWidth
- Migracja: kolumna `style_overrides jsonb default '{}'::jsonb`

Zmienione:
- `src/pages/NewsHubPostPage.tsx` — używa `PostInlineEditor`, layout z padding-right w trybie edycji, render z draftem, prompt przy zamknięciu z niezapisanymi zmianami
- `src/components/news-hub/PostContent.tsx` — dodaje opcjonalny prop `styleOverrides`, renderuje treść jako HTML (`dangerouslySetInnerHTML`) dla `article`/`announcement` (TipTap HTML), z fallbackiem na obecny tekst dla starych postów

### 8. Bezpieczeństwo HTML

- Treść TipTap przechowywana jako HTML — przy renderze sanitize (`DOMPurify`) przed `dangerouslySetInnerHTML`
- Dodać `dompurify` do zależności

---

### Uwagi
- Stary `PostDetailModal.tsx` (orphan) — usuwam przy okazji
- Migracja: dodanie `style_overrides` nullable; bez backfillu
- Mobile: na <1024 px panel zamiast 480 px zajmuje pełną szerokość (overlay), live preview pod panelem widoczny po zamknięciu