# Analiza: Architektura blokowa w module Aktualności

## Co jest możliwe bez naruszania innych funkcjonalności

Moduł Aktualności (`news_hub_posts`) jest **w pełni izolowany** — własna tabela, własne strony (`/aktualnosci`, `/aktualnosci/:slug`), własny edytor (`PostInlineEditor`). Wszystkie zmiany można wprowadzić **wyłącznie w obrębie tego modułu**, bez ryzyka dla CMS, partner pages, leader landingów, eventów itd.

Dobra wiadomość: w projekcie **już istnieje sprawdzony silnik blokowy** — `LandingBlockRenderer` z `leader-landing/blocks/` (Hero, Text, Image, Video, Quiz, Products, CTA, Testimonial, Form, Divider). Można go zaadaptować zamiast budować od zera.

---

## Realna propozycja: hybryda WordPress Gutenberg + szablony

### Co wdrażamy (możliwe w 100%)

**1. Architektura blokowa (jak Gutenberg)** — TAK, w pełni
- Treść postu = uporządkowana tablica bloków w JSONB (`content_blocks jsonb`), zamiast jednego pola HTML.
- Każdy blok ma typ, dane i styl. Bloki przesuwane w górę/dół (drag handle ↑↓), duplikowalne, usuwalne.
- Stare posty (HTML/plain text z TipTap) renderowane jako pojedynczy blok `legacy_html` — **zero utraty danych**.

**2. Typy bloków dostępne dla wpisu**
- `heading` (H1–H4, kolor, waga, align)
- `paragraph` (TipTap WYSIWYG — to co już mamy)
- `image` (upload, fit, wysokość, podpis, link)
- `gallery` (siatka, liczba kolumn)
- `video` (YouTube/Vimeo/upload — reużyty `VideoPlayer`)
- `file_download` (PDF/plik + przycisk pobierania + opis)
- `button_cta` (tekst, link, wariant, align)
- `quote` / `callout` (ramka z ważnym ogłoszeniem — kolor tła, ikona)
- `divider` (separator)
- `columns` (2 lub 3 kolumny — w środku inne bloki)
- `table` (proste tabele wyników)
- `embed` (iframe/HTML)

**3. Wzorce / Szablony postów (jak Patterns z Gutenberg)** — TAK
- Nowa tabela `news_hub_templates` z gotowymi układami bloków.
- Trzy startowe szablony zgodnie z Twoją propozycją:
  - **Szybki Update** — heading + paragraph + video
  - **Wiedza i Wyniki** — heading + paragraph + table + callout + gallery
  - **Materiały Promocyjne** — heading + paragraph + gallery + file_download (×N) + button_cta
- Admin przy tworzeniu nowego postu: „Pusty" / „Z szablonu →" (lista).
- Admin może też zapisać aktualny układ jako własny szablon.

**4. Drag & drop oraz styl per blok**
- Reorder w bocznym panelu edytora (już mamy 480px sidebar).
- Każdy blok ma własny mini-panel stylu (margines góra/dół, tło, max-width, align).
- Bez zewnętrznych page builderów — używamy `@dnd-kit/sortable` (już w projekcie).

**5. Responsywność**
- Przełącznik podglądu Desktop / Tablet / Mobile w nagłówku edytora (zmienia szerokość iframe podglądu).
- Per blok: opcjonalne ukryj na mobile / ukryj na desktop.

---

### Czego NIE robimy (i dlaczego)

- **Elementor/Divi/Webflow-style swobodny canvas (absolute positioning)** — to wymagałoby nowego silnika renderowania i zaburzyłoby spójność z resztą aplikacji (dark mode, tokeny semantyczne, mobile). Trzymamy **układ pionowy + kolumny** — daje 95% potrzeb przy zerowym ryzyku.
- **Edycja bezpośrednio na stronie (inline na froncie)** — zostawiamy obecny model: klik „Edytuj" → boczny panel 480px + live preview. To już działa i jest stabilne.
- **Globalne motywy/CSS overrides poza modułem** — wszystko zamknięte w `news_hub_*`.

---

## Sekcja techniczna

### Schema
- Migracja: `ALTER TABLE news_hub_posts ADD COLUMN content_blocks jsonb NOT NULL DEFAULT '[]'`.
- Pole `content` (TEXT) pozostaje dla wstecznej kompatybilności — renderowane jako blok `legacy_html` gdy `content_blocks` puste.
- Nowa tabela `news_hub_templates`: `id, name, description, preview_url, blocks jsonb, is_system bool, created_by`.
- RLS: read dla zalogowanych, write dla admina (analogicznie do `news_hub_posts`).

### Struktura bloku
```ts
type Block = {
  id: string;            // nanoid
  type: 'heading'|'paragraph'|'image'|'gallery'|'video'|'file_download'
       |'button_cta'|'callout'|'divider'|'columns'|'table'|'embed'|'legacy_html';
  data: Record<string, any>;
  style?: { mt?, mb?, bg?, align?, maxWidth?, hideMobile?, hideDesktop? };
};
```

### Nowe pliki
- `src/types/newsHubBlocks.ts` — typy bloków
- `src/components/news-hub/blocks/` — komponenty renderujące (Heading, Paragraph, Image, Gallery, Video, FileDownload, ButtonCta, Callout, Divider, Columns, Table, Embed, LegacyHtml)
- `src/components/news-hub/BlockRenderer.tsx` — switch po `block.type`
- `src/components/news-hub/editor/BlockListEditor.tsx` — lista bloków z `@dnd-kit` + przycisk „Dodaj blok ▾"
- `src/components/news-hub/editor/BlockInspector.tsx` — panel stylu per blok
- `src/components/news-hub/editor/TemplatePicker.tsx` — wybór szablonu przy tworzeniu
- `src/hooks/useNewsHubTemplates.ts`
- `src/pages/NewsHubTemplatesAdmin.tsx` — zarządzanie szablonami (lista + edytor)

### Zmienione pliki
- `PostContent.tsx` — jeśli `content_blocks.length > 0` renderuje przez `BlockRenderer`, w przeciwnym razie fallback na obecny HTML/plain (zero regresji dla istniejących postów).
- `PostInlineEditor.tsx` — w zakładce „Treść" zamiast samego `RichTextEditor` używa `BlockListEditor`. WYSIWYG przenosi się do bloku `paragraph`.
- `NewsHubAdminPage.tsx` — przy „Nowy post" pokazuje `TemplatePicker`.
- `useNewsHub.ts` — dodaje `content_blocks` do payloadu.

### Reużycie
- `VideoPlayer` z `PostContent.tsx` → blok `video`.
- `RichTextEditor` (TipTap) → blok `paragraph`.
- Inspiracja z `LandingBlockRenderer` (już sprawdzony wzorzec w projekcie).

### Bez naruszeń
- Zero zmian w: CMS pages, Partner pages, Leader landings, Events, Training, Knowledge Center, Chat, Video confs.
- Zero zmian w globalnym routingu, auth, RLS innych tabel.
- Stare posty działają identycznie (fallback `legacy_html`).

---

## Etapy wdrożenia

1. **Etap 1 — silnik bloków + 6 podstawowych typów** (heading, paragraph, image, video, file_download, button_cta) + migracja + fallback dla starych postów.
2. **Etap 2 — bloki rozszerzone** (gallery, callout, divider, columns, table, embed) + drag & drop reorder + per-block style.
3. **Etap 3 — szablony** (`news_hub_templates` + TemplatePicker + 3 systemowe szablony + UI „Zapisz jako szablon").
4. **Etap 4 — podgląd responsywny** (Desktop/Tablet/Mobile toggle + per-block visibility).

Każdy etap zamknięty, testowalny i bezpieczny do wdrożenia osobno.
