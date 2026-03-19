

# Plan: Edycja sekcji szablonu na stronie podglądu (admin)

## Cel
Na stronie `/admin/template-preview/:templateId` admin może najechać na dowolną sekcję (hover → outline/podświetlenie), kliknąć ją i otworzyć boczny panel z edytorem konfiguracji tej sekcji. Po zapisaniu zmiany są natychmiast widoczne w podglądzie i utrwalane w bazie.

## Zmiany

### 1. `TemplatePreviewPage.tsx` — dodanie trybu edycji

- Dodać stan `editingIndex: number | null` (indeks aktualnie edytowanej sekcji)
- Owinąć każdą renderowaną sekcję w klikalny wrapper `<div>` z:
  - `onClick` → ustawia `editingIndex`
  - `onMouseEnter/Leave` → hover outline (ring-2, ring-primary, cursor-pointer)
  - Mała ikonka Edit w rogu przy hover
- Gdy `editingIndex !== null` — wyświetlić boczny panel (Sheet/Drawer z prawej strony) z `SectionConfigEditor` z `PartnerTemplateEditor.tsx`

### 2. Wyodrębnienie `SectionConfigEditor` do osobnego pliku

Przenieść komponent `SectionConfigEditor` z `PartnerTemplateEditor.tsx` do `src/components/admin/template-sections/SectionConfigEditor.tsx`, aby mógł być reużywany zarówno w edytorze listy jak i w podglądzie.

### 3. Logika zapisu w `TemplatePreviewPage.tsx`

- Przy zmianie configu sekcji — aktualizować lokalny stan `template[]` (natychmiastowy podgląd)
- Przycisk "Zapisz" w panelu bocznym — zapisuje cały `template_data` do `partner_page_template` via Supabase
- Po zapisie — toast potwierdzający

### 4. UX na podglądzie

```text
┌─────────────────────────────────────────────────────┐
│ ← Wróć do edytora   Podgląd: PureLifeCenter2026    │
├─────────────────────────────────┬───────────────────┤
│                                 │ Edycja: Hero      │
│   [Sekcja Hero]  ← hover ring  │ ───────────────── │
│                                 │ Nagłówek: [____]  │
│   [Sekcja Steps]               │ Opis: [________]  │
│                                 │ Kolor tła: [■]    │
│   [Sekcja FAQ]                 │                    │
│                                 │ [Zapisz] [Zamknij]│
└─────────────────────────────────┴───────────────────┘
```

## Pliki

| Plik | Zmiana |
|------|--------|
| `src/components/admin/template-sections/SectionConfigEditor.tsx` | Nowy — wyodrębniony z PartnerTemplateEditor |
| `src/components/admin/template-sections/index.ts` | Eksport SectionConfigEditor |
| `src/components/admin/PartnerTemplateEditor.tsx` | Import SectionConfigEditor z nowego pliku |
| `src/pages/TemplatePreviewPage.tsx` | Dodać hover wrapper, Sheet z edytorem, logikę zapisu |

