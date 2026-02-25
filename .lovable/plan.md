

## Sortowanie i filtrowanie modułów w panelu administracyjnym

### Co się zmieni

Nad tabelą modułów pojawi się pasek filtrów z dwoma kontrolkami:

1. **Filtr języka** -- Select z opcjami: "Wszystkie języki" (domyslnie) + lista języków, w których faktycznie istnieją moduły (dynamicznie obliczana z `modules`). Po wybraniu języka tabela pokazuje tylko moduły w tym języku.

2. **Sortowanie** -- Select z opcjami:
   - "Wg pozycji" (domyślne, jak teraz -- `position`)
   - "Wg odsłaniania" (sortowanie po `unlock_order`, moduły bez order na końcu)

### Zmiany techniczne

**Plik: `src/components/admin/TrainingManagement.tsx`**

1. **Nowe stany:**
   - `const [languageFilter, setLanguageFilter] = useState<string>('all');`
   - `const [sortBy, setSortBy] = useState<'position' | 'unlock_order'>('position');`

2. **Obliczenie `filteredModules` (useMemo):**
   ```text
   const availableLanguages = useMemo(() => {
     const langs = new Set(modules.map(m => m.language_code || 'pl'));
     return LANGUAGE_OPTIONS.filter(l => l.code === 'all' || langs.has(l.code));
   }, [modules]);

   const filteredModules = useMemo(() => {
     let result = modules;
     if (languageFilter !== 'all') {
       result = result.filter(m => (m.language_code || 'pl') === languageFilter);
     }
     if (sortBy === 'unlock_order') {
       result = [...result].sort((a, b) => {
         if (a.unlock_order == null && b.unlock_order == null) return 0;
         if (a.unlock_order == null) return 1;
         if (b.unlock_order == null) return -1;
         return a.unlock_order - b.unlock_order;
       });
     }
     return result;
   }, [modules, languageFilter, sortBy]);
   ```

3. **Pasek filtrów** -- wstawiony przed sekcją mobile cards i desktop table (po formularzu modułu, ~linia 1286):
   - Dwa komponenty `Select` obok siebie w `flex` kontenerze.
   - Filtr języka: ikona Globe, opcje z flagami.
   - Sortowanie: opcje "Wg pozycji" / "Wg odsłaniania".

4. **Zamiana `modules` na `filteredModules`** -- w obu miejscach renderowania (mobile cards linia ~1296, desktop table linia ~1393) zmienić `modules.map(...)` na `filteredModules.map(...)` oraz `modules.length === 0` na `filteredModules.length === 0`.

