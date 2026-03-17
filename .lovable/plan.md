

# Plan: Dodanie grupy "PureBox" w pasku bocznym

## Zmiana

W `src/components/dashboard/DashboardSidebar.tsx` zamiast obecnego pojedynczego wpisu `skills-assessment` (linia 459) — utworzyć nowy element menu z podmenu o nazwie **"PureBox"**, który będzie grupą zbierającą narzędzia i podstrony. "Ocena umiejętności" stanie się pierwszym elementem tego podmenu.

## Co dokładnie

1. **Zamienić** samodzielny wpis:
   ```
   { id: 'skills-assessment', icon: Target, labelKey: 'Ocena umiejętności', path: '/skills-assessment' }
   ```
   na element z podmenu:
   ```
   {
     id: 'purebox',
     icon: Sparkles,  // lub inna ikona, np. Box/Package
     labelKey: 'PureBox',
     hasSubmenu: true,
     submenuItems: [
       { id: 'skills-assessment', labelKey: 'Ocena umiejętności', path: '/skills-assessment', icon: Target },
     ],
   }
   ```

2. **Zaimportować** ikonę `Sparkles` (lub `Package`) z `lucide-react` — jest już importowana w pliku.

3. Przyszłe narzędzia będą dodawane jako kolejne pozycje w `submenuItems` grupy PureBox.

## Plik do zmiany
- `src/components/dashboard/DashboardSidebar.tsx` — zamiana jednej pozycji menu na grupę z podmenu

