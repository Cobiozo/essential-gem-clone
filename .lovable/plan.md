

# Master toggle dla PureBox

## Koncepcja

Dodać rekord `element_key = 'purebox-master'` w tabeli `purebox_settings` jako główny przełącznik. Gdy wyłączony — cały moduł PureBox jest niewidoczny. Gdy włączony — widoczność poszczególnych elementów działa jak dotychczas.

## Zmiany

### 1. `src/hooks/usePureBoxVisibility.ts`
- W `isVisible()` najpierw sprawdzić rekord `purebox-master`: jeśli `is_active = false`, zwracać `false` dla wszystkich elementów
- Dodać nową funkcję `isPureBoxEnabled()` zwracającą stan master toggle (do użycia w sidebarze)

### 2. `src/components/admin/PureBoxManagement.tsx`
- Wyodrębnić rekord `purebox-master` z listy `elements` i nie wyświetlać go w grid elementów
- Na górze karty "Elementy modułu PureBox" dodać widoczny master switch z etykietą "Moduł PureBox" i opisem "Włącz/wyłącz cały moduł PureBox dla użytkowników"
- Gdy master jest wyłączony, reszta elementów jest wyszarzona (opacity + disabled)

### 3. `src/components/dashboard/DashboardSidebar.tsx`
- Bez zmian — obecna logika `isPureBoxVisible()` + filtrowanie submenu automatycznie ukryje PureBox gdy master jest off (bo `isVisible` zwróci false dla wszystkich elementów)

### 4. Baza danych — dodać rekord master
- INSERT do `purebox_settings`: `element_key = 'purebox-master'`, `element_name = 'Moduł PureBox'`, `is_active = true` (domyślnie włączony)

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/hooks/usePureBoxVisibility.ts` | Sprawdzanie master toggle w `isVisible()` |
| `src/components/admin/PureBoxManagement.tsx` | Master switch na górze UI, wyszarzenie gdy off |
| Migracja SQL | Insert rekordu `purebox-master` |

