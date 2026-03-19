

# Plan: Lista niezależnych szablonów w zakładce "Szablony"

## Problem
Aktualnie `EqologyTemplateManager` nadpisuje jedyny wiersz w `partner_page_template`, niszcząc stary szablon. Potrzebna jest osobna tabela na niezależne szablony.

## Rozwiązanie

### 1. Nowa tabela `partner_page_templates_gallery`

```sql
CREATE TABLE public.partner_page_templates_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL, -- 'eqology_omega3', future types
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

RLS: public read, admin-only write. Trigger na `updated_at`. Insert domyślnego szablonu Eqology.

### 2. Nowy komponent `TemplatesGalleryManager` (zastępuje `EqologyTemplateManager` w zakładce "Szablony")

Widok listy:
- Karty szablonów (nazwa, opis, typ, aktywny/nieaktywny, podgląd)
- Przycisk "Dodaj szablon" (na razie tylko typ Eqology)
- Kliknięcie na kartę otwiera edytor danego szablonu

Widok edycji:
- Pola: nazwa, opis, aktywność
- Istniejący `EqologyTemplateManager` jako formularz edycji treści (zrefaktorowany na props `data`/`onChange` zamiast własnego fetch/save)
- Przycisk "Zapisz" i "Wróć do listy"

### 3. Refaktor `EqologyTemplateManager`

Zmiana z samodzielnego komponentu (własny fetch/save) na **kontrolowany** komponent:
- Props: `data: EqologyTemplateData`, `onChange: (data) => void`
- Bez własnego `useEffect`/`save` — rodzic zarządza stanem i zapisem

### 4. Powiązanie z partnerem

Dodanie kolumny `selected_template_id UUID` do `partner_pages` (FK do `partner_page_templates_gallery`). Partner wybiera szablon z galerii, a publiczny renderer używa danych z wybranego szablonu.

Migracja: `ALTER TABLE partner_pages ADD COLUMN selected_template_id UUID REFERENCES partner_page_templates_gallery(id);`

### 5. Aktualizacja renderera `PartnerPage.tsx`

Zamiast czytać szablon z `partner_page_template`, sprawdza `selected_template_id` partnera → pobiera dane z `partner_page_templates_gallery` → renderuje odpowiedni komponent (Eqology lub fallback na stary system).

### Pliki

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Nowa tabela + kolumna `selected_template_id` |
| `src/components/admin/TemplatesGalleryManager.tsx` | **Nowy** — lista + edycja szablonów |
| `src/components/admin/EqologyTemplateManager.tsx` | Refaktor na kontrolowany komponent (props) |
| `src/components/admin/PartnerPagesManagement.tsx` | Zamiana `EqologyTemplateManager` na `TemplatesGalleryManager` w zakładce "Szablony" |
| `src/pages/PartnerPage.tsx` | Odczyt szablonu z `partner_page_templates_gallery` |
| `src/components/partner-page/PartnerPageEditor.tsx` | Dropdown wyboru szablonu dla partnera |

Zakładka "Szablon strony" (stary `PartnerTemplateEditor`) pozostaje **bez zmian**.

