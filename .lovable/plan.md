

# Analiza koncepcji podstron HTML w aplikacji

## Obecna architektura

### 1. Struktura bazy danych (`html_pages`)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | uuid | Klucz główny |
| `title`, `slug` | text | Tytuł i URL strony (`/html/{slug}`) |
| `html_content` | text | Surowy kod HTML strony |
| `custom_css` | text | Własne style CSS |
| `meta_title`, `meta_description` | text | Metadane SEO |
| `is_published`, `is_active` | boolean | Status publikacji |
| `visible_to_*` | boolean x5 | Widoczność per rola (clients, partners, specjalista, everyone, anonymous) |
| `show_header`, `show_footer` | boolean | Czy renderować nagłówek/stopkę PureLife |
| `show_in_sidebar` | boolean | Czy pokazać w menu bocznym |
| `sidebar_icon`, `sidebar_position` | text/int | Ikona Lucide i pozycja w menu |

**Istniejące strony:**
- `regulamin` - Regulamin (opublikowany)
- `polityka-prywatnosci` - Polityka Prywatności (opublikowana)
- `informacje-dla-klienta` - Informacje dla klienta (opublikowana)

---

### 2. Komponenty systemu

```text
┌─────────────────────────────────────────────────────────────────┐
│                    PANEL ADMINA                                 │
│  src/components/admin/HtmlPagesManagement.tsx                   │
│  └── Tabela stron + CRUD + Dialog edycji                        │
│      └── Zakładki: HTML | Podgląd | Ustawienia | Widoczność     │
│          └── HtmlHybridEditor (wizualny edytor WYSIWYG)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EDYTOR HYBRYDOWY                               │
│  src/components/admin/html-editor/                              │
│  ├── HtmlHybridEditor.tsx      - Główny edytor z 3 trybami     │
│  ├── hooks/useHtmlParser.ts    - Parsowanie HTML → elementy    │
│  ├── hooks/useHtmlSerializer.ts - Serializacja z powrotem      │
│  ├── DraggableHtmlElement.tsx  - Drag & Drop elementów         │
│  ├── SimplifiedPropertiesPanel.tsx - Panel właściwości         │
│  ├── HtmlElementToolbar.tsx    - Toolbar dodawania elementów   │
│  └── VisualSpacingEditor.tsx   - Edycja marginesów/paddingów   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RENDERER PUBLICZNY                           │
│  src/pages/HtmlPage.tsx                                         │
│  ├── Pobiera stronę z bazy po slug                             │
│  ├── Dynamicznie ładuje: Tailwind CDN, Lucide, Google Fonts    │
│  ├── Wstrzykuje custom_css przez <style> tag                   │
│  ├── Sanityzuje kolory dla dark mode                           │
│  └── Renderuje header/footer opcjonalnie                       │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Jak działa edytor wizualny

1. **Parser HTML** (`useHtmlParser.ts`):
   - Używa `DOMParser` do konwersji HTML na drzewo obiektów `ParsedElement`
   - Każdy element ma: `id`, `tagName`, `textContent`, `attributes`, `styles`, `children`

2. **Edycja wizualna**:
   - Drag & Drop (dnd-kit) do przestawiania elementów
   - Panel właściwości z suwakami dla kolorów, rozmiarów, odstępów
   - Inline editing tekstu przez podwójne kliknięcie
   - Toolbar z gotowymi szablonami (H1, H2, paragraf, obrazek, sekcja, grid)

3. **Serializacja** (`useHtmlSerializer.ts`):
   - Konwertuje drzewo `ParsedElement[]` z powrotem na HTML string
   - Zachowuje klasy Tailwind i style inline

---

## Czy ta koncepcja ma sens?

### Zalety obecnego rozwiązania

| Aspekt | Ocena | Komentarz |
|--------|-------|-----------|
| Elastyczność | ✅ Świetne | Pełna dowolność HTML/CSS - można zbudować wszystko |
| Edytor WYSIWYG | ✅ Świetne | Bogaty wizualny edytor z drag & drop |
| Izolacja | ✅ Dobre | Każda strona ma własny CSS, nie wpływa na resztę |
| SEO | ✅ Dobre | Meta title/description, poprawny HTML |
| Dark mode | ✅ Dobre | Automatyczna sanityzacja kolorów |
| Widoczność ról | ✅ Dobre | Kontrola per rola użytkownika |

### Problemy do rozwiązania

| Problem | Wpływ | Priorytet |
|---------|-------|-----------|
| **Sidebar nie ładuje dynamicznych stron** | Strony z `show_in_sidebar=true` nie pojawiają się w menu | 🔴 Krytyczny |
| **Brak Open Graph** | Strony nie mają og:title/og:image przy udostępnianiu | 🟡 Średni |
| **Brak responsywnego podglądu** | Edytor nie ma przełącznika mobile/tablet/desktop | 🟢 Niski |
| **visible_to_anonymous nie działa** | Strony legalne powinny być dostępne anonimowo | 🟡 Średni |

---

## Co trzeba zrobić

### 1. Dynamiczne ładowanie stron do Sidebara (KRYTYCZNE)

**Problem:** `DashboardSidebar.tsx` ma na sztywno zapisane pozycje menu. Strony z `show_in_sidebar=true` nie są pobierane z bazy.

**Rozwiązanie:**
```typescript
// W DashboardSidebar.tsx - dodać useQuery:
const { data: htmlPages } = useQuery({
  queryKey: ['html-pages-sidebar'],
  queryFn: async () => {
    const { data } = await supabase
      .from('html_pages')
      .select('id, title, slug, sidebar_icon, sidebar_position')
      .eq('is_published', true)
      .eq('is_active', true)
      .eq('show_in_sidebar', true)
      .order('sidebar_position');
    return data;
  }
});

// Następnie w liście menuItems dodać dynamiczne strony:
const dynamicHtmlPages: MenuItem[] = (htmlPages || [])
  .filter(page => {
    // Sprawdź widoczność per rola
    return checkRoleVisibility(page, userRole);
  })
  .map(page => ({
    id: `html-${page.slug}`,
    icon: LucideIcons[page.sidebar_icon] || FileText,
    labelKey: page.title,
    path: `/html/${page.slug}`,
  }));
```

### 2. Obsługa anonimowego dostępu

**Problem:** Strony legalne (Regulamin, Polityka Prywatności) powinny być dostępne bez logowania, ale `visible_to_anonymous` nie jest sprawdzane w `HtmlPage.tsx`.

**Rozwiązanie:**
- Dodać RLS policy pozwalającą na odczyt stron z `visible_to_anonymous=true`
- Zaktualizować istniejące strony legalne: `UPDATE html_pages SET visible_to_anonymous = true WHERE slug IN ('regulamin', 'polityka-prywatnosci')`

### 3. Dodanie Open Graph meta tagów

**Problem:** Przy udostępnianiu linku do strony HTML nie ma podglądu (obrazek, tytuł).

**Rozwiązanie - migracja bazy:**
```sql
ALTER TABLE html_pages ADD COLUMN IF NOT EXISTS og_image text;
ALTER TABLE html_pages ADD COLUMN IF NOT EXISTS og_title text;
ALTER TABLE html_pages ADD COLUMN IF NOT EXISTS og_description text;
```

**HtmlPage.tsx - dynamiczne meta tagi:**
```tsx
useEffect(() => {
  if (page?.og_image) {
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', page.og_image);
  }
}, [page]);
```

### 4. (Opcjonalnie) Responsywny podgląd w edytorze

Dodanie przycisków w `HtmlHybridEditor`:
```tsx
<div className="flex gap-1 border-l pl-2 ml-2">
  <Button size="sm" variant={viewWidth === '100%' ? 'default' : 'ghost'} 
          onClick={() => setViewWidth('100%')}>
    <Monitor className="w-4 h-4" />
  </Button>
  <Button size="sm" variant={viewWidth === '768px' ? 'default' : 'ghost'}
          onClick={() => setViewWidth('768px')}>
    <Tablet className="w-4 h-4" />
  </Button>
  <Button size="sm" variant={viewWidth === '375px' ? 'default' : 'ghost'}
          onClick={() => setViewWidth('375px')}>
    <Smartphone className="w-4 h-4" />
  </Button>
</div>
```

---

## CSS - Pełna funkcjonalność

### Obecne możliwości CSS

| Funkcja | Status | Implementacja |
|---------|--------|---------------|
| Custom CSS per strona | ✅ Działa | Pole `custom_css` w bazie, wstrzykiwane jako `<style>` |
| Tailwind CSS | ✅ Działa | CDN ładowany dynamicznie gdy wykryto klasy |
| Google Fonts | ✅ Działa | Montserrat + Open Sans ładowane gdy wykryto |
| Lucide Icons | ✅ Działa | CDN + `lucide.createIcons()` po załadowaniu |
| Dark mode | ✅ Działa | `sanitizeHtmlForDarkMode()` usuwa czarne kolory |

### Przykład użycia custom CSS

```css
/* W polu custom_css w panelu admina: */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 60vh;
}

.cta-button {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

---

## Podsumowanie rekomendacji

| Priorytet | Zadanie | Nakład pracy |
|-----------|---------|--------------|
| 🔴 1 | Dynamiczne ładowanie stron do sidebara | ~2h |
| 🔴 2 | Naprawienie widoczności dla anonimowych | ~1h |
| 🟡 3 | Dodanie Open Graph meta tagów | ~1.5h |
| 🟢 4 | Responsywny podgląd w edytorze | ~1h |

**Konkluzja:** Koncepcja stron HTML jest solidna technicznie i ma sens jako uzupełnienie głównego CMS. Edytor wizualny jest bogaty, CSS działa poprawnie. Główny problem to **brak integracji z dynamicznym sidebarem** - po naprawieniu tego system będzie w pełni funkcjonalny.

