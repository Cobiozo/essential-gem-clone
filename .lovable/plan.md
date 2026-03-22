

# Dodanie pola "Nazwa CTA / Kotwica" do folderów i plików BP

## Cel
Każdy folder i plik w module "Pliki na stronę BP" musi mieć edytowalne pole `cta_label` (nazwa pod przycisk / kotwica `#`), które będzie używane do linkowania CTA na stronie partnera.

## Baza danych — migracja

Dodanie kolumny `cta_label text` do obu tabel:

```sql
ALTER TABLE public.bp_page_folders ADD COLUMN cta_label text;
ALTER TABLE public.bp_page_files ADD COLUMN cta_label text;
```

## Zmiany w UI (`BpPageFilesManager.tsx`)

### Foldery
- Rozszerzenie interfejsu `BpFolder` o `cta_label: string | null`
- W formularzu tworzenia folderu: dodanie pola `Input` na "Nazwa CTA (kotwica #)"
- Przy wybranym folderze: wyświetlenie i edycja `cta_label` inline (np. mały input pod selectem folderów lub obok niego) z zapisem do bazy po blur/Enter

### Pliki
- Rozszerzenie interfejsu `BpFile` o `cta_label: string | null`
- Pod nazwą pliku w karcie (sekcja Info, linie 288-293): dodanie edytowalnego pola `cta_label` — małe pole input lub klikalna etykieta z inline edit
- Zapis do `bp_page_files` po blur/Enter
- Wyświetlenie kotwicy jako badge (np. `#moj-ebook`) gdy ustawiona

### Sanityzacja
- Automatyczna zamiana spacji na myślniki, lowercase — zgodnie z wzorcem anchor z `navigation-governance`

## Pliki do zmiany
| Plik | Akcja |
|------|-------|
| Migracja SQL | `ALTER TABLE` — dodanie `cta_label` do obu tabel |
| `BpPageFilesManager.tsx` | Edycja CTA label na folderach i plikach |
| `types.ts` (supabase) | Auto-regeneracja typów |

