## Plan: Osobne strony postów + edycja inline dla admina

### Cel
- Każdy kafelek/post w `/aktualnosci` otwiera się jako **osobna strona** (`/aktualnosci/:slug`) zamiast modala — można udostępniać linki, działa wstecz przeglądarki i SEO.
- Admin zarządza **przez kliknięcie elementu**: na kafelku widzi szybkie akcje (przypnij, ukryj, usuń, edytuj), a na stronie postu może włączyć tryb edycji i zmieniać tytuł, opis, treść bezpośrednio w miejscu.

---

### 1. Osobna strona postu

- Nowa trasa: `/aktualnosci/:slug`
- Nowy plik: `src/pages/NewsHubPostPage.tsx` — pełny widok postu z:
  - nagłówkiem z linkiem "← Centrum Aktualności"
  - cover image, kategorią, datą, typem
  - tytułem, krótkim opisem, treścią
  - dedykowanym widokiem dla typu (YouTube/Vimeo/galeria/plik/link/embed)
  - tagami, licznikiem wyświetleń
  - dynamicznymi meta tagami (`useDynamicMetaTags`) dla og:image, og:title, og:description
- Wspólny komponent `src/components/news-hub/PostContent.tsx` — wydzielony z obecnego `PostDetailModal` (te same widoki używane w modalu i na osobnej stronie)
- `PostCard` zamiast `onClick`→modal używa `<Link to={'/aktualnosci/' + slug}>`
- Modal `PostDetailModal` zostaje usunięty z `NewsHubPage` (nawigacja na stronę)

### 2. Pole `slug` w bazie

Migracja:
- Dodać kolumnę `slug TEXT UNIQUE` do `news_hub_posts`
- Backfill istniejących wierszy: `slugify(title) + '-' + short(id)`
- Trigger BEFORE INSERT/UPDATE generujący slug, gdy pusty
- Fallback: jeśli `useNewsHubPost(slug)` nie znajdzie po slugu, próbuje po `id`

### 3. Szybkie akcje admina na kafelku

Nowy komponent `src/components/news-hub/AdminCardOverlay.tsx`:
- Widoczny tylko dla admina, pojawia się na hover/tap kafelka
- Ikony w prawym górnym rogu (nie blokują przejścia do postu):
  - Pin/Unpin
  - Eye/EyeOff (publikuj/ukryj)
  - Pencil (przejście do `/aktualnosci/:slug?edit=1`)
  - Trash
- Akcje używają tych samych funkcji co `NewsHubAdminPage` (toggle/remove)

### 4. Tryb edycji inline na stronie postu

`NewsHubPostPage` ma dwa tryby:
- **Podgląd** (domyślny)
- **Edycja** (uruchamiany przez `?edit=1` lub przycisk "Edytuj" widoczny tylko adminowi)

W trybie edycji:
- Tytuł, krótki opis, treść → edytowalne pola `<Input>` / `<Textarea>` osadzone w miejscu, z auto-podglądem
- Boczny panel (Sheet) z polami: typ, kategoria, tagi, cover_url, media_url, file_url, link_url, link_cta, embed_html, bento_size, is_pinned, is_published
- Pasek narzędzi: "Zapisz", "Anuluj", "Usuń"
- `Zapisz` → update do `news_hub_posts`, wraca do trybu podglądu
- Anuluj → reset stanu

Nowy komponent `src/components/news-hub/PostInlineEditor.tsx` obsługujący edycję.

### 5. Zachowane: lista i tworzenie

- `/admin/news-hub` (tabela) pozostaje jako masowy przegląd, ale przycisk "Edytuj" prowadzi do `/aktualnosci/:slug?edit=1` zamiast otwierać `PostFormDialog`
- `PostFormDialog` używany dalej tylko do **tworzenia nowych** postów (potrzebny wybór typu przed inline)
- Akcje pin/publish/delete w tabeli bez zmian

### 6. Hook i routing

- `src/hooks/useNewsHub.ts`:
  - dodać `useNewsHubPost(slugOrId: string)` zwracający pojedynczy post w realtime
  - dodać `updatePost(id, patch)` i `deletePost(id)`
- `src/App.tsx`: nowa trasa `/aktualnosci/:slug` (chroniona jak pozostałe)
- `KNOWN_APP_ROUTES` / `PUBLIC_PATHS` / `ProfileCompletionGuard` — dopisać prefix `/aktualnosci/`

---

### Pliki

Utworzone:
- `src/pages/NewsHubPostPage.tsx`
- `src/components/news-hub/PostContent.tsx`
- `src/components/news-hub/PostInlineEditor.tsx`
- `src/components/news-hub/AdminCardOverlay.tsx`
- migracja SQL: kolumna `slug` + trigger + backfill

Zmienione:
- `src/components/news-hub/PostCard.tsx` (Link + AdminCardOverlay)
- `src/components/news-hub/PostDetailModal.tsx` (używa `PostContent` lub usunięty)
- `src/pages/NewsHubPage.tsx` (bez modala)
- `src/pages/NewsHubAdminPage.tsx` (edytuj → link do strony postu)
- `src/hooks/useNewsHub.ts` (nowe funkcje)
- `src/App.tsx` (trasa)
- `src/components/profile/ProfileCompletionGuard.tsx` (prefix)

---

### Pytanie do potwierdzenia
Modal podglądu zastępujemy **całkowicie** osobną stroną (rekomendowane: czyste UX, działa share/back/SEO). Jeśli wolisz zachować modal jako szybki podgląd i traktować osobną stronę jako opcję (np. "Otwórz w nowej karcie"), daj znać — wtedy zostawiamy oba.
