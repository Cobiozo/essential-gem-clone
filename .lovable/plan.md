

# Nowa zakładka "Pliki na stronę BP" w zarządzaniu stronami partnerskimi

## Co budujemy
Nowa zakładka obok "Ankieta" w `PartnerPagesManagement`, umożliwiająca upload i organizację plików (obrazów JPG itp.) na VPS. Pliki te służą jako źródła dla przycisków/akcji na szablonach stron partnerskich.

## Baza danych

### Nowa tabela `bp_page_files`
Metadane plików przesłanych na VPS:
```sql
create table public.bp_page_files (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  original_name text not null,
  file_url text not null,
  file_size bigint not null default 0,
  mime_type text,
  folder text not null default 'default',
  description text,
  position int not null default 0,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.bp_page_files enable row level security;
```
RLS: admin-only (select, insert, update, delete) za pomocą `public.has_role()`.

### Nowa tabela `bp_page_folders`
Organizacja folderów:
```sql
create table public.bp_page_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);
alter table public.bp_page_folders enable row level security;
```
RLS: admin-only. Seed z jednym domyślnym folderem.

## Nowy komponent: `BpPageFilesManager.tsx`

Interfejs wzorowany na istniejącym `AdminMediaLibrary`:

- **Zarządzanie folderami**: tworzenie, lista, usuwanie folderów
- **Upload plików**: wykorzystanie istniejącego `useLocalStorage` hook z `folder: 'bp-page-files/{folder_name}'`
- **Lista plików**: grid z miniaturkami (dla obrazów), nazwa, rozmiar, URL do kopiowania
- **Sortowanie**: drag-and-drop pozycjonowanie plików w folderze (pole `position`)
- **Akcje na pliku**: podgląd, kopiuj URL, usuń
- **Filtr po folderze**: select/dropdown do przełączania folderów

## Integracja

### `PartnerPagesManagement.tsx`
- Dodanie nowej zakładki `bp-files` z ikoną `FolderOpen`
- Import i render `BpPageFilesManager`

## Pliki do zmiany/utworzenia

| Plik | Akcja |
|------|-------|
| Migracja SQL | Tabele `bp_page_files` + `bp_page_folders` + RLS |
| `src/components/admin/BpPageFilesManager.tsx` | Nowy komponent |
| `src/components/admin/PartnerPagesManagement.tsx` | Dodanie zakładki |

