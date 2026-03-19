

# Plan: Nowy system Landing Page dla partnerów

## Koncepcja

Zamiast obecnego systemu gdzie partner wypełnia oddzielne pola formularza, proponuję podejście **"szablon z nakładkami"**:

1. **Admin** buduje kompletny landing page z bloków (hero, tekst+obraz, FAQ, CTA, itp.) — tak jak teraz
2. **W każdym bloku admin oznacza konkretne pola jako "edytowalne przez partnera"** (np. w hero: headline ✓, description ✓, ale bg_color ✗)
3. **Partner** widzi podgląd swojej strony z przyciskami edycji przy oznaczonych polach — edytuje inline, nie w oddzielnym formularzu
4. **Publiczna strona** renderuje szablon admina z nadpisaniami partnera (merge)

```text
┌─────────────────────────────────────┐
│  ADMIN: Tworzy szablon              │
│  ┌─────────────────────────────┐    │
│  │ Hero block                   │    │
│  │  headline: "Odkryj zdrowie" │    │  ← admin ustawia treść
│  │  headline.editable: true    │    │  ← admin oznacza jako edytowalne
│  │  bg_color: "#0a1628"        │    │
│  │  bg_color.editable: false   │    │  ← partner NIE może zmienić
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  PARTNER: Widzi podgląd + edycja    │
│  ┌─────────────────────────────┐    │
│  │ "Odkryj zdrowie" [✏️ Edytuj]│    │  ← może zmienić
│  │  bg_color: zablokowane      │    │  ← nie widzi opcji
│  └─────────────────────────────┘    │
│  custom_data = {                    │
│    "hero_1": { "headline": "Mój tytuł" }  │
│  }                                  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  PUBLICZNA STRONA: merge            │
│  template.config + partner.overrides│
│  → finalny headline = "Mój tytuł"  │
└─────────────────────────────────────┘
```

## Zmiany techniczne

### 1. Rozszerzenie struktury szablonu (bez migracji DB)

Obecne `template_data` JSONB już przechowuje `config` per element. Dodamy w configu pole `editable_fields: string[]` — listę kluczy, które partner może nadpisać.

```typescript
// Np. element hero w template_data:
{
  id: "hero_1",
  type: "hero",
  config: {
    headline: "Odkryj zdrowie z Eqology",
    description: "Najwyższej jakości...",
    bg_color: "#0a1628",
    cta_primary: { text: "Zamów", url: "" },
    editable_fields: ["headline", "description", "cta_primary.url"]
    // ↑ admin zaznacza checkboxami które pola partner może edytować
  }
}
```

Nie wymaga migracji — to zmiana w strukturze JSONB.

### 2. Admin: checkboxy "edytowalne" w edytorach sekcji

W każdym edytorze sekcji (HeroSectionEditor, CtaBannerEditor, itp.) dodać checkboxy przy polach:
- `☑ Edytowalne przez partnera` 
- Zaznaczone pola trafiają do `config.editable_fields[]`

**Pliki**: `src/components/admin/template-sections/*.tsx` (11 edytorów)

### 3. Partner: nowy edytor z podglądem inline

Zamiast obecnego formularza z polami, partner widzi:
- Podgląd renderowanej strony (te same komponenty co publiczna)
- Przy edytowalnych polach — ikona ✏️ z popoverem do edycji
- Tylko pola z `editable_fields` są edytowalne

**Nowy komponent**: `src/components/partner-page/PartnerPageInlineEditor.tsx`

Logika merge:
```typescript
const getMergedConfig = (templateConfig, partnerOverrides) => {
  const merged = { ...templateConfig };
  for (const field of templateConfig.editable_fields || []) {
    if (partnerOverrides[field] !== undefined) {
      merged[field] = partnerOverrides[field];
    }
  }
  return merged;
};
```

### 4. Aktualizacja `PartnerPageEditor.tsx`

Zastąpienie obecnego formularza nowym inline editorem. Partner widzi:
- Nagłówek z aliasem, switchem aktywności, przyciskiem podglądu
- Poniżej: podgląd strony z przyciskami edycji przy edytowalnych polach
- Sekcja produktów (pozostaje bez zmian)

### 5. Aktualizacja publicznego renderera `PartnerPage.tsx`

Zmiana logiki renderowania — merge template config z `custom_data` partnera:
```typescript
// Zamiast: <HeroSection config={cfg} />
// Teraz:   <HeroSection config={mergeConfig(cfg, customData[element.id])} />
```

### 6. Aktualizacja `usePartnerPage.ts`

Zmiana `savePartnerPage` — `custom_data` teraz przechowuje nadpisania per element:
```typescript
custom_data: {
  "hero_1": { "headline": "Mój tytuł", "description": "Mój opis" },
  "cta_1": { "cta_text": "Kup teraz" }
}
```

## Pliki do zmiany/utworzenia

| Plik | Zmiana |
|------|--------|
| `src/components/admin/template-sections/*.tsx` | Dodać checkboxy `editable_fields` w każdym edytorze |
| `src/components/admin/template-sections/EditableFieldToggle.tsx` | **Nowy** — reużywalny komponent checkbox |
| `src/components/partner-page/PartnerPageInlineEditor.tsx` | **Nowy** — edytor inline z podglądem |
| `src/components/partner-page/PartnerPageEditor.tsx` | Użycie nowego inline editora |
| `src/pages/PartnerPage.tsx` | Merge config + overrides |
| `src/hooks/usePartnerPage.ts` | Dostosowanie zapisu custom_data |
| `src/types/partnerPage.ts` | Dodanie `editable_fields` do typów |

## Co NIE zmienia się

- Struktura DB (JSONB jest elastyczny)
- Galeria szablonów i cooldown 14 dni
- Katalog produktów i linki partnerskie
- System dostępu (usePartnerPageAccess)
- Publiczny routing `/:alias`

