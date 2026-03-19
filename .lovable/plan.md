

# Plan: Sidebar zwinięty domyślnie + wyszukiwarka elementów w panelu admina

## Zmiany

### 1. `src/pages/Admin.tsx` — sidebar zwinięty domyślnie

Zmiana `defaultOpen={true}` na `defaultOpen={false}` w `SidebarProvider` (linia 3020).

### 2. `src/components/admin/AdminSidebar.tsx` — wyszukiwarka w sidebarze

Dodanie pola wyszukiwania (`Input` z ikoną `Search`) w `SidebarHeader`, pod logo. Filtrowanie `navCategories` — gdy wpisany tekst, wyświetlane są tylko pasujące elementy (po labelu), a ich kategorie są automatycznie rozwinięte. Przy pustym polu — standardowy widok.

Logika:
- Stan `searchQuery` w komponencie
- `filteredCategories` = mapowanie `navCategories` z przefiltrowanymi `items` (porównanie `getLabel(item.labelKey).toLowerCase()` z query)
- Kategorie z 0 wynikami są ukrywane
- Gdy query aktywne, wszystkie kategorie z wynikami są otwarte (override `openCategories`)
- Pole wyszukiwania widoczne tylko gdy sidebar rozwinięty

### Pliki do zmiany

| Plik | Zmiana |
|------|------|
| `src/pages/Admin.tsx` | `defaultOpen={false}` |
| `src/components/admin/AdminSidebar.tsx` | Dodanie `searchQuery`, filtrowania, komponentu `Input` z `Search` icon |

