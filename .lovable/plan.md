# System stron HTML - Dokumentacja

## ✅ Ukończone naprawy (2025-02-05)

### 1. Dynamiczne ładowanie stron do Sidebara ✅
**Implementacja:** `DashboardSidebar.tsx`
- Dodano `useQuery` pobierający strony z `show_in_sidebar=true`
- Filtrowanie widoczności per rola użytkownika
- Dynamiczne ikony Lucide (fallback na `FileText`)

### 2. Obsługa anonimowego dostępu ✅
**Migracja bazy:**
- Dodano RLS policy: `"Anonymous users can view public pages"`
- Zaktualizowano strony legalne: `visible_to_anonymous = true`

### 3. Open Graph meta tagi ✅
**Migracja bazy:** 
- `og_image`, `og_title`, `og_description` kolumny

**Implementacja:**
- `HtmlPage.tsx` - dynamiczne ustawianie meta tagów OG i Twitter
- `HtmlPagesManagement.tsx` - UI do edycji OG w ustawieniach strony

### 4. Responsywny podgląd w edytorze ✅
**Implementacja:** `HtmlHybridEditor.tsx`
- Przyciski Desktop/Tablet/Mobile (100%/768px/375px)
- Symulowany viewport z ramką i cieniem

---

## Architektura systemu

### Baza danych (`html_pages`)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | uuid | Klucz główny |
| `title`, `slug` | text | Tytuł i URL (`/html/{slug}`) |
| `html_content` | text | Kod HTML |
| `custom_css` | text | Własne style |
| `meta_*`, `og_*` | text | SEO i Open Graph |
| `visible_to_*` | boolean | Widoczność per rola |
| `show_in_sidebar` | boolean | Pozycja w menu |

### Komponenty

```
Admin Panel
├── HtmlPagesManagement.tsx (CRUD + ustawienia OG)
└── HtmlHybridEditor/ (edytor WYSIWYG)
    ├── Tabs: Visual | Code | Preview
    ├── Responsive preview (Desktop/Tablet/Mobile)
    └── DnD, inline editing, properties panel

Renderer
└── HtmlPage.tsx
    ├── Dynamic meta tags (SEO + OG)
    ├── Tailwind/Lucide/Fonts CDN
    └── Dark mode sanitization

Sidebar
└── DashboardSidebar.tsx
    └── useQuery html_pages → dynamic menu items
```

### Istniejące strony
- `/html/regulamin` - Regulamin
- `/html/polityka-prywatnosci` - Polityka Prywatności
- `/html/informacje-dla-klienta` - Informacje dla klienta
