

# Plan: Napraw szablon strony partnera

## Problem
Tabela `partner_page_template` zawiera dane szablonu Eqology (obiekt JSON z `theme`/`sections`) zamiast oryginalnego formatu tablicy `TemplateElement[]`. Komponent `PartnerTemplateEditor` próbuje wywołać `.sort()` na obiekcie, co powoduje nieskończone ładowanie.

## Rozwiązanie

### 1. Przywrócenie danych w `partner_page_template`
Zresetować `template_data` do pustej tablicy `[]` (oryginalny format), ponieważ oryginalne dane zostały nadpisane i nie da się ich odzyskać.

**Migracja SQL:**
```sql
UPDATE partner_page_template 
SET template_data = '[]'::jsonb;
```

### 2. Zabezpieczenie `PartnerTemplateEditor`
Dodać walidację w `useEffect` — sprawdzić czy `template_data` jest tablicą przed wywołaniem `.sort()`:

```typescript
const rawData = data.template_data as any;
const elements = Array.isArray(rawData) ? rawData : [];
setElements(elements.sort(...));
```

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Reset `template_data` do `[]` |
| `src/components/admin/PartnerTemplateEditor.tsx` | Walidacja `Array.isArray()` przed `.sort()` |

